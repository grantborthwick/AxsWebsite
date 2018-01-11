var isKSU = (window.location.origin || window.location.host || window.location.hostname).indexOf("k-state.edu") !== -1;
var Officer, PledgeClass, Family, Album, AlbumPicture, AlbumVideo, Faq, ViewModel;
(function($, ko){
    "use strict";
    var generatedData;
    var families = ["Gold", "Silver", "Copper", "Iron", "Mercury", "Lead", "Tin"];
    (function knockoutExtensions(){
        ko.extenders.sort = function(target, options) {
            target.sort = ko.computed({read: function(){
                var values = ko.toJS(target);
                return values.sort(function(a, b){
                    var av = options.get(a);
                    var bv = options.get(b);
                    if (options.asc){
                        return av >= bv ? 1 : -1;
                    } else {
                        return av < bv ? 1 : -1;
                    }
                });
            }, pure: true, deferEvaluation: true }).extend({rateLimit:0});
            return target;
        };
    })();
    (function defineTypes() {
        var littleSorting = {sort:{get:function(obj){return obj.date;}}};
        var familiesIndex = {};
        for (var i = 0; i < families.length; ++i){
            familiesIndex[families[i]] = i;
        }
        Officer = function(position, name, email, picture, pronoun, objectivePronoun, year, major, minor){
            var self = this;
            self.position = position;
            self.name = name;
            self.email = email;
            self.picture = picture;
            self.pronoun = pronoun;
            self.objectivePronoun = objectivePronoun;
            self.year = year;
            self.major = major;
            self.minor = minor;
        };
        PledgeClass = function(semester, picture){
            var self = this;
            self.semester = semester;
            self.picture = picture;
        };
        Family = function(name){
            var self = this;
            self.name = name;
        };
        Album = function(name, pictures, albumList){
            var self = this;
            self.name = name;
            self.pictureList = pictures || [];
            self.albumList = albumList || [];
            self.path = "";
            self.x = function(){};
            self.x.path = function(){
                if (self instanceof ViewModel){
                    return [];
                } else if (self.x.parent && self.x.parent.x.path){
                    var path = self.x.parent.x.path();
                    path.push(self);
                    return path;
                } else {
                    return [self];
                }
            }
            self.x.get = function(index, direction) {
                if (index === -1){
                    return undefined;
                }
                direction = direction || 0;
                return self.pictureList[(index + direction + self.pictureList.length) % self.pictureList.length];
            };
            var getSubPictures = function getSubPictures (){
                var ret = [];
                ret.push.apply(ret, this.pictureList);
                for (var i = 0; i < this.albumList.length; ++i){
                    ret.push.apply(ret, getSubPictures.call(this.albumList[i]));
                }
                return ret;
            }
            self.x.previewPictures = function(count){
                var ret = [];
                var tempPictureList = getSubPictures.call(self);
                if (tempPictureList.length == 0){
                    for (var i = 0; i < count; ++i){
                        ret.push(new AlbumPicture());
                    }
                    return ret;
                }
                while (count -ret.length >= tempPictureList.length){
                    ret.push.apply(ret, tempPictureList.sort(function(){return Math.random() >= .5 ? 1 : -1;}));
                }
                for (var i = ret.length; i < count; ++i){
                    var next = Math.floor(Math.random() * tempPictureList.length);
                    ret.push(tempPictureList[next]);
                    var temp = tempPictureList.slice(0, next)
                    temp.push.apply(temp, tempPictureList.slice(next + 1));
                    tempPictureList = temp;
                }
                return ret;
            }
        };
        AlbumPicture = function(src) {
            this.src = src;
            var slashIndex = src ? src.lastIndexOf("/") : -1;
            this.name = slashIndex === -1 ? src : src.substr(slashIndex + 1);
        };
        AlbumVideo = function(v) {
            var self = this;
            self.v = v;
            AlbumPicture.call(this, "http://img.youtube.com/vi/" + v + "/hqdefault.jpg");
            self.name = v + ".v";
            self.title = ko.observable();
            gyt(v, function(data){
                self.title(data.entry.title.$t);
            }, function (err){
                console.log(err); 
            });
        };
        AlbumVideo.prototype = new AlbumPicture();
        AlbumVideo.prototype.constructor = AlbumVideo;
        Faq = function(question, answer) {
            this.question = question;
            this.answer = answer;
        }
        ViewModel = function(){
            Album.call(this, "pictures");
            var self = this;
            self.pledgeClassAlbum = new Album();
            self.pledgeClassAlbum.path = "#/members/classes";
            self.familyAlbum = new Album();
            self.familyAlbum.path = "#/members/families";
            self.pledgeClassList = ko.observableArray().extend({sort:{get:function(obj){return new Date(obj.semester)}}});
            self.familyList = [];
            self.albumList = [];
            
            // Copy generated data onto this object
            for (var propertyName in generatedData) {
                self[propertyName] = generatedData[propertyName];
            }
            
            self.debug = ko.observable(false);

            // todo: figure out the bug that removing this triggers...
            self.pictureList = [];
            
            self.toSemester = function (date){
                var d = new Date(date);
                var semester = d.getMonth() > 5 ? "Fall" : "Spring";
                return semester + " " + d.getFullYear();
            };
            
            self.x.currentAlbum = ko.observable(this);
            self.x.currentAlbumIndex = ko.observable(-1);
            self.x.currentAlbumItem = ko.computed({read: function(){
                return self.x.currentAlbum().x.get(self.x.currentAlbumIndex());
            }, pure: true, deferEvaluation: true });
            var getAlbumItemPath = function(index, direction){
                var item = self.x.currentAlbum().x.get(index, direction);
                return self.x.currentAlbum().path + "/" + (item ? item.name : undefined);
            };
            self.x.nextAlbumItemPath = ko.computed({read: function(){
                return getAlbumItemPath(self.x.currentAlbumIndex(), 1);
            }, pure: true, deferEvaluation: true }).extend({rateLimit:0});
            self.x.previousAlbumItemPath = ko.computed({read: function(){
                return getAlbumItemPath(self.x.currentAlbumIndex(), -1);
            }, pure: true, deferEvaluation: true }).extend({rateLimit:0});
            
            self.x.getOfficer = function(position){
                for (var i = 0; i < self.officerList.length; ++i){
                    if (self.officerList[i].position === position){
                        return self.officerList[i];
                    }
                }
            };
            
            self.x.dateString = function(date){
                var weekDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][date.getDay()];
                var month = ["January","February","March","April","May","June","July","August","September","October","November","December"][date.getMonth()];
                var day = date.getDate();
                var dayEnding = ["st","nd","rd","th"][Math.min(3,(day - 1) % 20)];
                var year = date.getFullYear();
                return weekDay + ", " + month + " " + day + dayEnding +", " + year + ".";
            }
            
            self.page = ko.observable("");
            
            // Easter eggs :)
            self.eggs = {};
            self.eggs.cats = ko.observable(false);
            self.eggs.cats.subscribe(function(newValue){
                
            });
        };
        ViewModel.prototype = new Album();
        ViewModel.prototype.constructor = ViewModel;
    })();
    
    generatedData = getGeneratedData();
    
    (function initializeViewModel(){
        var viewModel = new ViewModel();
        window.viewModel = viewModel;
        
        // Initialize albums
        var splitAlbums = function(albums){
            var ret = [];
            for (var i = 0; i < albums.length; ++i){
                ret.push(addAlbum("images/albums", albums[i].n, albums[i].a, albums[i].p));
            }
            return ret;
        };
        var addAlbum = function(src, name, albums, pictures){
            var subAlbums = [];
            var albumPictures = [];
            var albumSrc = src + "/" + name;
            for (var i = 0; albums && i < albums.length; ++i){
                subAlbums.push(addAlbum(albumSrc, albums[i].n, albums[i].a, albums[i].p));
            }
            for (var i = 0; pictures && i < pictures.length; ++i){
                var p = pictures[i];
                if (p instanceof AlbumVideo){
                    albumPictures.push(p);
                } else {
                    albumPictures.push(new AlbumPicture(albumSrc + "/" + pictures[i]));
                }
            }            
            return new Album(name, albumPictures, subAlbums);
        };
        viewModel.albumList.push.apply(viewModel.albumList, splitAlbums(generatedData.albums));
        var setAlbumPaths = function setAlbumPaths(album, path){
            album.path = path + (album.name ? "/" + album.name : "");
            for (var i = 0; i < album.albumList.length; ++i){
                setAlbumPaths(album.albumList[i], album.path);
                album.albumList[i].x.parent = album;
            }
        }
        setAlbumPaths(viewModel, "#");
        
        // Initialize members
        // Organize by pledge class
        var basePledgeSrc = "images/pledgeClasses/";
        var baseFamilySrc = "images/families/";
        var classes = [
            {date: "4/13/2002", src: "2002f.jpg"},
            {date: "4/11/2003", src: "2003s.jpg"},
            {date: "4/29/2005", src: "2004s.jpg"},
            {date: "4/29/2005", src: "2005s.jpg"},
            {date: "3/31/2006", src: "2006s.jpg"},
            {date: "11/17/2006", src: "2006f.jpg"},
            {date: "11/21/2008", src: "2008f.jpg"},
            {date: "12/3/2010", src: "2010f.jpg"},
            {date: "4/30/2011", src: "2011s.jpg"},
            {date: "12/3/2011", src: "2011f.jpg"},
            {date: "4/28/2012", src: "2012s.jpg"},
            {date: "11/10/2012", src: "2012f.jpg"},
            {date: "4/27/2013", src: "2013s.jpg"},
            {date: "11/16/2013", src: "2013f.jpg"},
            {date: "4/27/2014", src: "2014s.jpg"},
            {date: "12/10/2014", src: "2014f.jpg"},
            {date: "4/25/2015", src: "2015s.jpg"},
            {date: "11/15/2015", src: "2015f.jpg"},
            {date: "4/25/2016", src: "2016s.jpg"},
            {date: "11/15/2016", src: "2016f.jpg"}]
        for (var i = 0; i < classes.length; ++i){
            var pictureUrl = basePledgeSrc + classes[i].src;
            var pledgeClass = new PledgeClass(classes[i].date, pictureUrl);
            viewModel.pledgeClassList[pledgeClass.semester] = pledgeClass;
            viewModel.pledgeClassList.push(pledgeClass);
            
            viewModel.pledgeClassAlbum.pictureList.unshift(new AlbumPicture(pictureUrl));
        }
        
        // Families        
        for (var i = 0; i < families.length; ++i){
            var family = new Family(families[i]);
            viewModel.familyList.push(family);
            viewModel.familyList[family.name] = family;
            
            viewModel.familyAlbum.pictureList.push(new AlbumPicture(baseFamilySrc + families[i] + ".jpg"));
        }
    })();
    window.app = $.sammy(function applicationRouting() {
        this.get("#/", function() { viewModel.page(''); });
        this.get(/\#\/(.*)\/$/, function() {
            this.redirect(window.location.hash.substr(0, window.location.hash.length - 1));
        });
        this.get("#/about", function() { viewModel.page('about/axs'); });
        this.get("#/members", function() { viewModel.page('members/classes'); });
        this.get("#/professional", function() { viewModel.page('professional/outreach'); });
        //#/pictures
        var getAlbum = function(name){
            for (var i = 0; i < this.albumList.length; ++i){
                if (this.albumList[i].name === name){
                    return this.albumList[i];
                }
            }
            return this;
        };
        var navigateAlbum = function(path){
            if (!path){
                viewModel.x.currentAlbumIndex(undefined);
                viewModel.x.currentAlbum(viewModel);
                return;
            }
            var ptr = viewModel;
            for (var i = 0; path && i < path.length; ++i){
                if (path[i].length){
                    ptr = getAlbum.call(ptr, path[i]);
                }
            }
            viewModel.x.currentAlbum(ptr);
            var current = path[path.length - 1];
            if (current.indexOf(".") !== -1){
                for (var i = 0; i < ptr.pictureList.length; ++i){
                    var item = ptr.pictureList[i];
                    if (item.name === current){                        
                        viewModel.x.currentAlbumIndex(i);
                        return;
                    }
                }
            }
            viewModel.x.currentAlbumIndex(-1);
        };
        var setPath = function(){viewModel.page(window.location.hash.substr(2, window.location.hash.length - 2));};
        this.get("#/pictures", function() {
            navigateAlbum();
            setPath();
        });
        this.get(/\#\/pictures\/(.*)$/, function() {
            var path = this.params.splat[0].split("/");
            navigateAlbum(path);
            setPath();
        });
        this.get("#/members/classes/:current", function() { 
            viewModel.page('members/classes'); 
            viewModel.x.currentAlbum(viewModel.pledgeClassAlbum);
            var current = this.params.current;
            for (var i = 0; i < viewModel.pledgeClassAlbum.pictureList.length; ++i){
                var item = viewModel.pledgeClassAlbum.pictureList[i];
                if (item.name === current){                        
                    viewModel.x.currentAlbumIndex(i);
                    return;
                }
            }
        });
        this.get("#/members/families/:current", function() { 
            viewModel.page('members/families'); 
            viewModel.x.currentAlbum(viewModel.familyAlbum);
            var current = this.params.current;
            for (var i = 0; i < viewModel.familyAlbum.pictureList.length; ++i){
                var item = viewModel.familyAlbum.pictureList[i];
                if (item.name === current){                        
                    viewModel.x.currentAlbumIndex(i);
                    return;
                }
            }
        });
        this.get("#/members/classes", function() { 
            viewModel.page('members/classes'); 
            viewModel.x.currentAlbum(viewModel);
            viewModel.x.currentAlbumIndex(-1);
        });
        this.get("#/members/families", function() { 
            viewModel.page('members/families'); 
            viewModel.x.currentAlbum(viewModel);
            viewModel.x.currentAlbumIndex(-1);
        });
        this.get(/\#\/(.*)$/, setPath);
    });
    $(function startApplication(){
        app.run("#/");
        ko.applyBindings(viewModel);
    });
    (function googleAnalytics(){        
        if (isKSU){
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
            ga('create', 'UA-44769519-1', 'auto');
            ga('send', 'pageview');
        }
    })();
    function gyt(v, callback, errorCallback) {
        if (!v)
            return;
        $.ajax({url: "http://gdata.youtube.com/feeds/api/videos/" + v + "?v=2&alt=json",dataType: "jsonp",timeout: 1e4,success: callback,error: errorCallback})
    }
    (function keyboardInput (){
        var keysPressed = [];
        var key = {a: 65,b: 66,c: 67,d: 68,e: 69,f: 70,g: 71,h: 72,i: 73,j: 74,k: 75,l: 76,m: 77,n: 78,o: 79,p: 80,q: 81,r: 82,s: 83,t: 84,u: 85,v: 86,w: 87,x: 88,y: 89,z: 90,n1: 49,n2: 50,n3: 51,n4: 52,n5: 53,n6: 54,n7: 55,n8: 56,n9: 57,n0: 48,left: 37,right: 39,up: 38,down: 40,plus: 187,minus: 189,del: 46,mozPlus: 61,mozMinus: 173,escape: 27};
        var timeout = -10;
        var pressed = function(letters){
            for (var i = 0; i < letters.length; ++i){
                var value = keysPressed[key[letters[i]]];
                if (!value || value <= 0) {
                    return false;
                }
            }
            for (var i = 0; i < letters.length; ++i){
                keysPressed[letters[i]] = timeout * 10;
            }
            return true;
        };
        var handle = function(){
            if (viewModel.x.currentAlbumIndex() !== -1){
                if (keysPressed[key.escape] && keysPressed[key.escape] >= 0){
                    $("#viewerClose").click();
                    keysPressed[key.escape] = timeout;
                }else if (keysPressed[key.left] && keysPressed[key.left] >= 0){
                    $("#viewerPrevious").click();
                    keysPressed[key.left] = timeout;
                } else if (keysPressed[key.right] && keysPressed[key.right] >= 0){
                    $("#viewerNext").click();
                    keysPressed[key.right] = timeout;
                }
            }
            if (pressed("debug")){
                viewModel.debug(!viewModel.debug());
                console.log("Debug: " + viewModel.debug());
            }
            if (pressed("cats") || pressed("meow")){
                viewModel.eggs.cats(!viewModel.eggs.cats());
                console.log("Meow! " + viewModel.eggs.cats());
            }
        };
        $(window).keydown(function(key) {
            keysPressed[key.keyCode] = keysPressed[key.keyCode] || 0;
            keysPressed[key.keyCode] += 1;
            handle();
        }).keyup(function(key) {
            keysPressed[key.keyCode] = 0;
        })
    }());
    (function easterEggs (){
        // cats
        var pictureSelector = "body, #objects, .object, #header, #footer, .picture, .officerPicture, .albumPreview, .albumPicturePreview, .albumPicture"
        var catsOff = function(){
            $(pictureSelector).filter(function(){
                var background = $(this).css("background-image");
                return background.indexOf("placekitten") !== -1;
            }).each(function(){
                var self = $(this);
                self.css("background-image", self.css("background-image").split(",").slice(1).join(","));
            });
        };
        var catsOn = function(){
            $(pictureSelector).filter(function(){
                var background = $(this).css("background-image");
                return background.indexOf("placekitten") === -1;
            }).each(function(){
                var self = $(this);
                var multiplier = (Math.random() - .5)/4 + 1;
                self.css("background-image", "url(http://placekitten.com/" + Math.floor(self.outerWidth() * multiplier) + "/" + Math.floor(self.outerHeight() * multiplier) +")," + self.css("background-image"));
            });
        };
        viewModel.eggs.cats.subscribe(function(newValue){
            if (newValue){
                catsOn();
                setTimeout(catsOn, 200);
            } else {
                catsOff();
            }
        });
        window.app.bind("event-context-after", function(e) {
            if (viewModel.eggs.cats()){
                catsOn();
            } else {
                catsOff();
            }
        });
    })();

    /* Functions that source from generated content */
    /* Don't manually update this data! Update the source files and run Update.ps1. */
    function getGeneratedData() {
        var unshift = function(){
            var ret = [];
            for (var i = 0; i < arguments.length; ++i){
                if ($.isArray(arguments[i])){
                    ret.unshift.apply(ret, arguments[i]);
                } else {
                    ret.unshift(arguments[i]);
                }
            }
            return ret;
        };
        var num = function(count){
            var ret = [];
            for (var i = 1; i <= count; ++i){
                ret.push(i + ".jpg");
            }
            return ret;
        };
        return {
            lastUpdated: new Date(
/* Initialize Today */
'01/11/2018 05:52:59Z'
/* End Initialize Today */
            ),

            gitOrigin:
/* Initialize Git Origin */
'https://github.com/grantborthwick/AxsWebsite'
/* End Initialize Git Origin */
            ,

            gitBranch:
/* Initialize Git Branch */
'grant/pronoun'
/* End Initialize Git Branch */
            ,

            gitCommit:
/* Initialize Git Commit */
'e25e4fd579d11408b4cb4a96f8ace84c3b85ccd3'
/* End Initialize Git Commit */
            ,

            gitCommitDate: new Date(
/* Initialize Git Commit Date */
'2018-01-10 22:35:26 -0700'
/* End Initialize Git Commit Date */
            ),

            gitMasterCommit: new Date(
/* Initialize Git Master Commit */
'e25e4fd579d11408b4cb4a96f8ace84c3b85ccd3'
/* End Initialize Git Master Commit */
            ),

            gitMasterCommitDate: new Date(
/* Initialize Git Master Commit Date */
'2018-01-10 22:35:26 -0700'
/* End Initialize Git Master Commit Date */
            ),
            
            officerList: [
/* Initialize Officers */
new Officer('Master Alchemist', 'Patrick Gillespie', 'patrickj115@ksu.edu', 'images/officers/Patrick_Gillespie.jpg', 'he', 'him', 'Junior', 'Chemistry', ''),
new Officer('Vice Master Alchemist', 'Karter Krokstrom', 'kkrokstrom@ksu.edu', 'images/officers/no photo', 'he', 'himJunior', 'Chemical Engineering', '', ''),
new Officer('Master of Ceremonies', 'Emily Wedeman', 'ewedeman@k-state.edu', 'images/officers/Emily_Wedeman.jpg', 'she', 'her', 'Junior', 'Chemical Engineering', ''),
new Officer('Outreach Coordinator', 'Lacey Beck', 'laceybeck2013@ksu.edu', 'images/officers/Lacey_Beck.jpg', 'she', 'her', 'Senior', 'Chemistry', ''),
new Officer('Assistant Outreach Coordinator', 'Muriel Eaton', 'meaton02@ksu.edu', 'images/officers/Muriel_Eaton.jpg', 'she', 'her', 'Senior', 'Biochemistry', ''),
new Officer('Social Chair', 'Marquix Adamson', 'marquix@ksu.edu', 'images/officers/Marquix_Adamson.jpg', 'he', 'him', 'Junior', 'Chemistry', ''),
new Officer('Recorder', 'Stephanie Lee', 'stephlee24@ksu.edu', 'images/officers/Sarah_Price.jpg', 'Senior', 'she', 'her', 'Chemical Science and Animal Bioscience', ''),
new Officer('Treasurer', 'Courtney Hess', 'chess25@ksu.edu', 'images/officers/no photo', 'Senior', 'she', 'her', 'Chemical Science and Animal Bioscience', ''),
new Officer('Historian', 'Sydney Masters', 'smasters@ksu.edu', 'images/officers/Sydney_Masters.jpg', 'she', 'her', 'Sophomore', 'Life Sciences, Pre-Optometry Major', ''),
new Officer('Reporter', 'Gabrielle Ciccarelli', 'grciccar@ksu.edu', 'images/officers/Gabrielle_Ciccarelli.jpg', 'she', 'her', 'Sophomore', 'Nutritional Science', ''),
new Officer('Webmaster', 'Vladislav Dubrovenski', 'vladi@ksu.edu', 'images/officers/Vladislav_Dubrovenski.jpg', 'he', 'him', 'Junior', 'Computer Science', ''),
new Officer('Alumni Secretary', 'Dustin Nelsen', 'dnelsen@ksu.edu', 'images/officers/no photo', 'he', 'him', 'Junior', '', ''),
new Officer('Chapter Advisor', 'Emery Brown', 'emerybrown@ksu.edu', 'images/officers/Emery_Brown.jpg', 'he', 'him', 'Graduate Student', 'Analytical Chemistry', '')
/* End Initialize Officers */
            ],

            faqList: [
/* Initialize Faq */
new Faq('Aren\'t fraternities just for men?', 'Although most fraternities for women call themselves sororities, fraternity is the more general term for a greek letter organization. We are a fraternity in the true sense of the word. All members are referred to as brothers, including our female members.'),
new Faq('What is a professional faternity?', 'A professional fraternity selects its members based on common professional goals and interests. The more common social fraternities choose their members based on similar social interests. However, professional fraternities can have just as much fun as social ones, just ask any one of our members.'),
new Faq('What is pledging?', 'You can join some organizations simply by filling out a form and mailing in your dues. Joining a fraternity is more work. Pledging is a process where a potential member associates with our fraternity for several months before becoming a brother. This gives both you and us a chance to get to know each other before we mutually agree that our fraternity is a good fit for you.'),
new Faq('Does AΧΣ Haze?', 'Absolutely not. As a professional fraternity, we have a zero-tolerance policy on hazing. Pledges who are uncomfortable with what is asked of them by a member of the fraternity should voice their concerns and, if necessary, report the matter to one of the fraternity officers.'),
new Faq('Is pledging fun?', 'We certainly hope so. If you don\'t enjoy pledging, you won\'t enjoy being a member either. If, unfortunately, you view coming to fraternity meetings and events a hassle rather than a time for fun, perhaps you might reconsider joining our fraternity.'),
new Faq('How much of a time commitment is pledging?', 'Expect to spend a minimum of three or four hours per week with your potential brothers and fellow pledges. We have mandatory pledge meetings once a week and recommended activities on some weekends. The time commitment is more than that to join most clubs, but much less than that to join a social fraternity. We will not wake you up at 5am to do push ups! The time commitment for pledging is meant to be the same as for a minimally active member. If you don\'t have time to pledge, you wont have time to be a member. All that being said, many pledges find themselves voluntarily spending more time with Alpha Chi Sigma than required. It\'s fun you\'ll see!'),
new Faq('What will I do as a pledge?', 'As a pledge you will have a \'big,\' an active member to act as mentor and help you through the pledging process. You\'ll have to learn a little about the fraternities history and alchemy (yes, you will be quizzed). Mostly though, you will be having fun and learning what brotherhood is all about. Pledge events include bowling, a potluck, trivia night, AΧΣ Jeopardy, and many more!'),
new Faq('Can I be a member of another fraternity or sorority if I join AΧΣ?', 'Since we are the only chemistry fraternity on campus, the answer is yes. In fact, several of our brothers are also in social fraternities and sororities.'),
new Faq('Is AΧΣ only at K-State?', 'No! There are about 50 chapters of AΧΣ all across the United States. Here\'s a <a href=\'http://www.alphachisigma.org\'>link</a> to the national web-site, and here\'s a <a href=\'http://www.alphachisigma.org/page.aspx?pid=262\'>link</a> to a list of our chapters.'),
new Faq('I\'m a grad student. Why would I want to associate with undergrads?', 'Well, first of all, we are not only undergrads. Many of our active members are graduate students. In fact, many professors are also AΧΣ brothers. Since we are a professional fraternity, we also have an active presence in industry and a number of professional chapters. AΧΣ is not just for undergrads, it\'s for life.')
/* End Initialize Faq */
            ],

            albums: [
/* Initialize Albums */
{
    n: '2016',
    a: [{
            n: 'Bowling Fall 2016',
            p: unshift(['14317410_10208953208446359_5644881458121621194_n.jpg', '14322507_10208953218486610_8467792022806382474_n.jpg', '14355746_10208953208766367_7631534818919819788_n.jpg', '14368822_10208953208406358_3718688573191430093_n.jpg', '14370397_1144303042329436_2246313095086173674_n.jpg'])
        }, {
            n: 'Games 2016',
            p: unshift(['13118869_10207912493309131_8433279687904938908_n.jpg', '13124750_10207912493029124_477872911758439414_n.jpg', '13139165_10207912493109126_1332213298870332989_n.jpg', '13151992_10207912493269130_5778067442865302146_n.jpg', '13166004_10207912493709141_1988099957621491295_n.jpg', '13177513_10207912494029149_7740890606724221718_n.jpg', '13177794_10207912493629139_3445795309725040243_n.jpg'])
        }, {
            n: 'Initiation Fall 2016',
            p: unshift(['15194466_10209676682532759_2079685953717433348_o.jpg', '15195832_10209676701213226_5478860424601419105_o.jpg', '15195833_10209676671892493_4042189948815601329_o.jpg', '15196035_10209676672092498_5235788218301513839_o.jpg', '15235352_10209676690812966_2240647809717789227_o.jpg', '15235475_10209676671612486_4953772521394407766_o.jpg', '15235607_10209676670812466_1716409236746637433_o.jpg', '15235795_10209676686852867_1859111567952227196_o.jpg', '15250765_10209676678932669_8408488800317063469_o.jpg', '15250859_10209676680612711_8472295887039697826_o.jpg', '15250935_10209676680132699_3459292985950173030_o.jpg', '15252520_10209676697053122_1880850131236868591_o.jpg', '15252522_10209676689092923_5112859614173428207_o.jpg', '15252687_10209676696933119_4196639918114729579_o.jpg', '15259251_10209676675972595_5051742688862830359_o.jpg', '15271985_10209676687332879_938253951118354170_o.jpg', '15272068_10209676674692563_358403256320984253_o.jpg', '15272238_10209676694973070_9100412098376682857_o.jpg', '15272311_10209676692933019_6894423262433521732_o.jpg', '15289141_10209676689812941_1733212286172575833_o.jpg', '15289324_10209676701973245_8900019434971788732_o.jpg', '15304102_10209676676172600_8642893866057577365_o.jpg', '15304152_10209676701013221_1375584610506358920_o.jpg', '15304301_10209676693173025_6056440671415753133_o.jpg', '15304489_10209676694853067_2293367564243133735_o.jpg', '15304542_10209676691532984_1672148534115309777_o.jpg'])
        }, {
            n: 'May 2016-September 2016(Spring2016 initiation)',
            p: unshift(['14524596_10209324980180420_8600890094351735715_o.jpg', '14556582_10209324987820611_2821802891597645709_o.jpg', '14566300_10209324974340274_3802321817389426417_o.jpg', '14566308_10209324973380250_1545481955996721550_o.jpg', '14566469_10209324979300398_6810383164346398581_o.jpg', '14570558_10209324976140319_6478247796717157282_o.jpg', '14590027_10209324986340574_1277708796761448066_o.jpg', '14590063_10209324990660682_5789147366391341386_o.jpg', '14608819_10209324991220696_6643178962070002848_o.jpg', '14612433_10209324991820711_4798253062579690253_o.jpg', '14692058_10209324983900513_5576592448521368296_o.jpg', '14692059_10209324985180545_6404813895739044906_o.jpg', '14706758_10209324969620156_922814863272778797_o.jpg', '14706920_10209324984660532_7613422385318498194_o.jpg', '14708057_10209324963339999_8368038977180313326_o.jpg', '14711034_10209324963460002_6879253932430844749_o.jpg', '14711617_10209324960859937_1382565659278426473_o.jpg', '14711645_10209324978180370_6664973183231958700_o.jpg', '14712481_10209324971820211_8051050566156681613_o.jpg', '14712500_10209324966140069_8939142760016407213_o.jpg', '14712570_10209324989380650_3997833037958873811_o.jpg', '14712732_10209324966380075_6991037883338161857_o.jpg', '14714795_10209324978740384_1012172721326919037_o.jpg', '14714909_10209324982740484_1356647984142962920_o.jpg', '14714917_10209324977740359_3897706938485402874_o.jpg', '14715516_10209324960899938_2065968936188262558_o.jpg', '14715576_10209324986140569_699567684691428331_o.jpg', '14753807_10209324987940614_3380126132234450167_o.jpg', '14852990_10209324990100668_2379057437886917878_o.jpg', '14853132_10209324989060642_4688909320417302415_o.jpg', '14853149_10209324968940139_72855477937094174_o.jpg', '14853192_10209324981060442_6500677153006086798_o.jpg', '14853227_10209324975340299_7876818305325518962_o.jpg'])
        }, {
            n: 'Open House BBQ contest',
            p: unshift(['12983773_10207221483914278_5623093060984533677_o.jpg', '12990837_10207221482954254_8289999084214834740_n.jpg', '13002475_10207221484074282_4882311975251754468_o.jpg', '13012801_10207221482714248_2657602767043478415_n.jpg', '13012866_10207221482314238_6760006090598709177_n.jpg', '13015505_10207221483194260_2845004211892936889_n.jpg'])
        }, {
            n: 'Open House Spring 2016',
            p: unshift(['12983233_1042734239097466_5056416010314643157_o.jpg', '13041096_1042734265764130_408865001931673967_o.jpg', '13055775_1042734259097464_8607292752350283132_o.jpg'])
        }, {
            n: 'Outreach',
            p: unshift(['15235877_1215939531776935_7093700089098872760_o.jpg', '15259251_1215939548443600_4595020675952338175_o.jpg', '15259463_1215939528443602_1403674773528338801_o.jpg', '15259697_1215939431776945_602937517252257101_o.jpg', '15272309_1215939435110278_3829915840392924886_o.jpg', '15304541_1215939425110279_27212347684677071_o.jpg'])
        }, {
            n: 'Social Event Spring 2016',
            p: unshift(['13118869_10207912493309131_8433279687904938908_n.jpg', '13124750_10207912493029124_477872911758439414_n.jpg', '13139165_10207912493109126_1332213298870332989_n.jpg', '13151992_10207912493269130_5778067442865302146_n.jpg', '13166004_10207912493709141_1988099957621491295_n.jpg', '13177513_10207912494029149_7740890606724221718_n.jpg', '13177794_10207912493629139_3445795309725040243_n.jpg'])
        }
    ]
},
{
    n: '2015',
    a: [{
            n: 'AXE 50th Celebration',
            p: unshift(['887466_10206668750696343_7753741677132290912_o.jpg', '887504_10206668722375635_7358527510223142260_o.jpg', '905563_10206668716055477_2888632084874183112_o.jpg', '905563_10206668748936299_7554036138898374759_o.jpg', '905743_10206668745816221_7800633805798336287_o.jpg', '1888876_10206668730175830_3324978178923717364_o.jpg', '10548710_10206668744656192_3583872194164880392_o.jpg', '11012063_10206668723975675_6523279830225572727_o.jpg', '11015796_10206668730215831_4403498329885732929_o.jpg', '11052006_10206668731055852_217575328132899017_o.jpg', '11054410_10206668736335984_3827689963927921348_o.jpg', '11063854_10206668730975850_7101378723936788350_o.jpg', '11110513_10206668797377510_6984941951768488625_o.jpg', '11114043_10206668713495413_2139337852194138033_o.jpg', '11223725_10206668733535914_6070764636398814597_o.jpg', '11233565_10206668711935374_3603593793095289586_o.jpg', '11235452_10206668718375535_2308796824541501731_o.jpg', '11236475_10206668727255757_2115663989151602425_o.jpg', '11950195_10206668752096378_8159314133958658709_o.jpg', '12087922_10206668711135354_9032419438776481142_o.jpg', '12182397_10206668755296458_7693084419718092292_o.jpg', '12182428_10206668726215731_2465264717576653033_o.jpg', '12182442_10206668750576340_2933003152302136181_o.jpg', '12182466_10206668727335759_8852719976319859036_o.jpg', '12182740_10206668741816121_5472126913515931217_o.jpg', '12182917_10206668727375760_7248584979801380444_o.jpg', '12182933_10206668721855622_4644390005026371862_o.jpg', '12182980_10206668741896123_8747230545292883570_o.jpg', '12182981_10206668712655392_3211958825513932017_o.jpg', '12182981_10206668720775595_7262795017346349129_o.jpg', '12182993_10206668744336184_6574184000744090601_o.jpg', '12183720_10206668740136079_4707006826421686920_o.jpg', '12183796_10206668724855697_5973764362323816271_o.jpg', '12183797_10206668712575390_2255865689684993035_o.jpg', '12183840_10206668744456187_8371242502198244078_o.jpg', '12183894_10206668734655942_4097495352264162346_o.jpg', '12183912_10206668724895698_6944329448833693691_o.jpg', '12183932_10206668733495913_5713029996871076993_o.jpg', '12183999_10206668743256157_1512884106973596936_o.jpg', '12184037_10206668750776345_1715605357839630796_o.jpg', '12184037_10206668753336409_2106632752931632280_o.jpg', '12184073_10206668709255307_171548414479373193_o.jpg', '12184119_10206668710535339_1206192785747301661_o.jpg', '12184300_10206668713535414_3746333382681766583_o.jpg', '12185051_10206668734615941_5488613774778898301_o.jpg', '12185077_10206668733455912_6861420964955154665_o.jpg', '12185093_10206668708375285_1327845863363030583_o.jpg', '12185119_10206668719335559_7303364631258628478_o.jpg', '12185129_10206668734495938_5421710939519620839_o.jpg', '12185142_10206668728375785_3524783431066751693_o.jpg', '12185154_10206668712615391_1523706018038544586_o.jpg', '12185157_10206668732255882_6931196742337051635_o.jpg', '12185260_10206668745976225_6724873990763791850_o.jpg', '12185397_10206668739096053_5884795421946975712_o.jpg', '12185415_10206668714695443_5010474419377672528_o.jpg', '12185557_10206668737256007_7577639447430244042_o.jpg', '12186253_10206668740216081_6919421862719803422_o.jpg', '12186260_10206668736295983_8840631027057657314_o.jpg', '12186321_10206668748976300_2137761845257936745_o.jpg', '12186351_10206668710455337_5415588682793108283_o.jpg', '12186356_10206668724935699_5357718701065418488_o.jpg', '12186359_10206668720815596_352834353865489675_o.jpg', '12186461_10206668719455562_4973920782662959904_o.jpg', '12186486_10206668711895373_1636104193778817524_o.jpg', '12186510_10206668740176080_6943628385628797022_o.jpg', '12186651_10206668718455537_2776669402530983839_o.jpg', '12186672_10206668720455587_6732677942156255370_o.jpg', '12186676_10206668726095728_5801451165532505712_o.jpg', '12186766_10206668711055352_5536949871352649688_o.jpg', '12186852_10206668708415286_8569623481962507115_o.jpg', '12187955_10206668711015351_2531879663608501269_o.jpg', '12188001_10206668709375310_4492965090003881581_o.jpg', '12188002_10206668721895623_6954903218937245593_o.jpg', '12188009_10206668717175505_3176541039511369319_o.jpg', '12188150_10206668741856122_802452329321962723_o.jpg', '12189257_10206668731615866_1672160060067675896_o.jpg', '12189260_10206668729015801_6200330833523382988_o.jpg', '12189264_10206668714615441_4346569110284394253_o.jpg', '12189286_10206668713415411_1829181853678375794_o.jpg', '12189287_10206668746056227_7920036774270976827_o.jpg', '12189377_10206668708455287_4070550556610982781_o.jpg', '12189390_10206668722735644_1718287973488912146_o.jpg', '12189393_10206668716015476_7567649075414739512_o.jpg', '12191150_10206668732535889_4342246443095346435_o.jpg', '12191152_10206668717255507_6373136512100849109_o.jpg', '12191179_10206668718975550_4367455639716657957_o.jpg', '12191191_10206668747336259_8353554658417910705_o.jpg', '12191200_10206668717215506_7609010601770118850_o.jpg', '12191200_10206668743376160_4387633617154645428_o.jpg', '12191203_10206668730255832_214331565911208126_o.jpg', '12191219_10206668729295808_1230664567133213888_o.jpg', '12191269_10206668723855672_357435831560478801_o.jpg', '12191279_10206668721535614_5683223897711542232_o.jpg', '12191363_10206668737496013_909248799659673111_o.jpg', '12194503_10206668715975475_1873766085330366873_o.jpg', '12194536_10206668710495338_7282989204876016334_o.jpg', '12194663_10206668739176055_8869562405988474121_o.jpg', '12194673_10206668728615791_4091839328208444499_o.jpg', '12194726_10206668709295308_1150118102082206730_o.jpg', '12194773_10206668729335809_3968361980216692111_o.jpg', '12194782_10206668732295883_2451464580800432778_o.jpg', '12194843_10206668722495638_3092156657969709628_o.jpg', '12194877_10206668728535789_7724168334260812590_o.jpg', '12194960_10206668712055377_6278549418942974341_o.jpg', '12194970_10206668743136154_4371811175493226967_o.jpg', '12195039_10206668718135529_3453780749155412560_o.jpg', '12195067_10206668726175730_4811155405806318649_o.jpg', '12195131_10206668724055677_2068200497741606497_o.jpg', '12195134_10206668714575440_1732956247052911670_o.jpg'])
        }, {
            n: 'Pledge Week 2015'
        }, {
            n: 'Senior Farewell 2015',
            p: unshift(['11026107_10206293912405620_5258298160024985502_o.jpg', '11882816_10206293840563824_4851327776809219530_o.jpg', '11893912_10206293845403945_4626212825638134589_o.jpg', '11921833_10206293838843781_438921678761751920_o.jpg', '11922854_10206293912245616_6925256637856630036_o.jpg', '11930925_10206293848644026_1089608805474813485_o.jpg', '11935221_10206293845363944_4311969557114443757_o.jpg', '11942220_10206293912445621_5352375481193633063_o.jpg', '11947870_10206293911525598_1571484950307812131_o.jpg', '11950155_10206293840483822_9166690086142243621_o.jpg', '11951596_10206293912205615_8280431482029869165_o.jpg', '11953345_10206293848764029_5304741326630547406_o.jpg'])
        }, {
            n: 'South Dakota Trip Spring',
            p: unshift(['1479152_10205393557697315_3267462613747638876_n.jpg', '1510062_10205393555657264_3922520943711112381_n.jpg', '10360709_10205393562417433_7076878592391997770_n.jpg', '10409326_10205393563697465_1436911039139914577_n.jpg', '10462906_10205393552017173_7929381767875646702_n.jpg', '10689443_10205393559897370_1121663658155034880_n.jpg', '10929206_10205393554537236_5936024703869808947_n.jpg', '10952537_10205393560897395_2645899015025639735_n.jpg', '10985052_10205393560257379_5437515990476888668_n.jpg', '11014665_10205393564937496_8150961257385934195_n.jpg', '11017450_10205393554857244_4726823992375691447_n.jpg', '11021515_10205393561457409_3088196904437045621_n.jpg', '11055275_10205393552057174_1184731716082444406_n.jpg', '11055311_10205393556337281_6641224533494849605_n.jpg', '11072698_10205393558337331_3504252203068096764_n.jpg', '11082533_10205393551977172_4439259075026997872_n.jpg', '11102999_10205393558537336_3344018348157932975_n.jpg', '11111132_10205393562777442_2212897797647636639_n.jpg', '11118367_10205393553257204_1343722550080674872_n.jpg', '11148471_10205393558577337_3522864937341153917_n.jpg', '11149365_10205393554057224_2820123432934414165_n.jpg', '11149466_10205393557657314_2473098313305702091_n.jpg', '11150750_10205393561737416_4921984407777361741_n.jpg', '11156232_10205393561497410_2396490757143801598_n.jpg', '11156419_10205393559537361_324520084168471833_n.jpg', '11160575_10205393556377282_1472952638939968374_n.jpg', '11168077_10205393553457209_5591835671643886240_n.jpg', '11169920_10205393554497235_8857174390831765696_n.jpg', '11170342_10205393565257504_4802339534156224405_n.jpg', '11173324_10205393563377457_5973804879716985116_n.jpg', '11174954_10205393556857294_8567647718253539695_n.jpg', '11175007_10205393556017273_6894229629733352258_n.jpg', '11178261_10205393553497210_9207345556386052034_n.jpg', '11182030_10205393566017523_7042845280967790795_n.jpg'])
        }, {
            n: 'Spring Initiation',
            p: unshift(['22315_10205491261779856_3372487214750878616_n.jpg', '1463064_10205491258819782_5014253895873616869_n.jpg', '10929069_10205491260339820_232521425946746133_n.jpg', '11006400_10205491260739830_8080350519453245841_n.jpg', '11076998_10205491262219867_6401024506287661284_n.jpg', '11148620_10205491258899784_9215904971505233923_n.jpg', '11193407_10205491260299819_389706215009612521_n.jpg', '11210521_10205491261739855_8395665379075150949_n.jpg', '11245487_10205491260179816_2950451061784880661_n.jpg', '11255751_10205491258859783_5427019370754782197_n.jpg'])
        }
    ]
},
{
    n: '2014',
    a: [{
            n: 'Pledge Week - Ice Skating',
            p: unshift(num(21))
        }, {
            n: 'Goggle Sales',
            p: unshift(num(2))
        }, {
            n: 'Activities Carnival',
            p: unshift(num(7))
        }, {
            n: 'Lady of Unity Show',
            p: unshift(num(36))
        }, {
            n: 'Initiation Spring 2014',
            p: unshift(['11705_10205393532416683_3164038330046625628_n.jpg', '21989_10205393537496810_846558055583077784_n.jpg', '1908180_10205393525496510_892586845905388490_n.jpg', '10462935_10205393537136801_1832621174338375125_n.jpg', '10575438_10205393528976597_3679028977779470330_o.jpg', '10675742_10205393533576712_4196898288595839922_n.jpg', '10906522_10205393535096750_8658085900003631167_n.jpg', '11112935_10205393528656589_1391070638167444816_n.jpg', '11113918_10205393531096650_6825474080853590688_n.jpg', '11116487_10205393529456609_7566613904727411117_n.jpg', '11136641_10205393527696565_6539525384559763197_n.jpg', '11148322_10205393535296755_2115668882849106783_n.jpg', '11149272_10205393539496860_3721911396658524025_n.jpg', '11149322_10205393535576762_8649485500423806258_n.jpg', '11149398_10205393525536511_6005338387003453306_n.jpg', '11150395_10205393525456509_6950931934394953854_n.jpg', '11150395_10205393527736566_8901661160957257516_n.jpg', '11150590_10205393529896620_6734198968862118423_n.jpg', '11156281_10205393524216478_6764330441104736806_n.jpg', '11156406_10205393536896795_5751027335597538686_n.jpg', '11156419_10205393534416733_8836551972740246220_n.jpg', '11164773_10205393528456584_6373808324415298801_n.jpg', '11169973_10205393530936646_502290414427080776_n.jpg', '11174800_10205393524296480_2918398256921788411_n.jpg', '11174837_10205393524256479_1374108016399081999_n.jpg', '11175040_10205393533616713_7325655047649047619_n.jpg', '11182134_10205393537856819_8091812752363338902_n.jpg'])
        }
    ]
},
{
    n: '2013',
    a: [{
            n: 'Secret Santa',
            p: unshift(num(44))
        }, {
            n: 'Formal At Delta Chapter',
            p: unshift(num(6))
        }, {
            n: 'Faculty Dinner',
            p: unshift(num(10))
        }, {
            n: 'Fall Initiation',
            p: unshift(num(20))
        }, {
            n: 'Expansion Trip',
            p: unshift(['2013-12-07 23.56.13-3.jpg', '2013-12-07 23.56.37-2.jpg', '2013-12-07 23.56.46-2.jpg', '2013-12-07 23.57.05-2.jpg'])
        }, {
            n: 'Mall Show',
            p: unshift(num(137), new AlbumVideo('FUWXZSVsWxI'))
        }, {
            n: 'Kansas City Professional Group Picnic',
            p: unshift(num(7))
        }, {
            n: 'Spring Scavenger Hunt',
            p: unshift(num(123))
        }, {
            n: 'Piñata',
            p: unshift(['2013-05-09 18.39.31.jpg', '2013-05-09 18.40.22.jpg', '2013-05-09 18.43.15.jpg', '2013-05-09 18.43.52.jpg', '2013-05-09 18.44.05.jpg', '2013-05-09 18.48.32.jpg'])
        }, {
            n: 'Fall Activity Fair',
            p: unshift(num(11))
        }, {
            n: 'Birthday Halloween',
            p: unshift(num(53))
        }, {
            n: 'Spring Initiation',
            p: unshift(num(21))
        }, {
            n: 'Open House',
            p: unshift(num(117))
        }, {
            n: 'Spring Pledging',
            p: unshift(num(56))
        }, {
            n: 'Composite Pictures',
            p: unshift(['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', '15.jpg', '16.jpg', '17.jpg', '18.jpg', '19.jpg', '20.jpg', '21.jpg', '22.jpg', '23.jpg', '24.jpg', '25.jpg', '26.jpg', 'DavidMartin.jpg', 'FernandoNieto.jpg', 'GeorgePodaru.jpg', 'HarrisonSchmidt.jpg', 'JacobSchroeder.jpg', 'JennyBarriga.jpg', 'KatelynSalmans.jpg', 'KelseyCrow.jpg', 'KelsieCole.jpg', 'KendallKonrade.jpg', 'LauraMallonee.jpg', 'Lauren Conrow.jpg', 'PeterBetzen.jpg', 'SarahMunday.jpg', 'SeanSmith.jpg', 'TristanGrieves.jpg', 'VinhHoang.jpg'])
        }, {
            n: 'Glens Harem',
            p: unshift(num(7))
        }, {
            n: 'Professional Induction Ceremony',
            p: unshift(num(7))
        }, {
            n: 'Fall Formal Pledging',
            p: unshift(num(6))
        }, {
            n: 'Central District Conclave',
            p: unshift(num(44))
        }, {
            n: 'Fall Pledge Week',
            p: unshift(num(13))
        }
    ]
},
{
    n: '2012',
    a: [{
            n: 'Secret Santa',
            p: unshift(num(25))
        }, {
            n: 'Spring and Fall Initiations',
            p: unshift(num(9))
        }, {
            n: 'Birthday and Halloween',
            p: unshift(num(14))
        }, {
            n: 'Fall Pledge Week',
            p: unshift(num(9))
        }, {
            n: 'Putt Putt',
            p: unshift(num(9))
        }, {
            n: 'Professional Branch Induction',
            p: unshift(num(36))
        }, {
            n: 'Open House',
            p: unshift(num(107))
        }, {
            n: 'Mall Show',
            p: unshift(num(97))
        }, {
            n: 'Faculty Dinner',
            p: unshift(num(7))
        }, {
            n: 'Cosmosphere',
            p: unshift(num(20))
        }, {
            n: 'April 14th Show',
            p: unshift(num(54))
        }, {
            n: 'Periodic Table Cleanup',
            p: unshift(num(25))
        }
    ]
},
{
    n: '2011',
    a: [{
            n: 'Birthday and Halloween',
            p: unshift(num(18))
        }, {
            n: 'Fall and Spring Initiations',
            p: unshift(num(7))
        }, {
            n: 'Spring Potluck',
            p: unshift(num(2))
        }, {
            n: 'Mall Show',
            p: unshift(num(5))
        }, {
            n: 'Photo Scavenger Hunt',
            p: unshift(num(17))
        }
    ]
},
{
    n: '2010',
    a: [{
            n: 'Birthday Halloween',
            p: unshift(num(36))
        }, {
            n: 'Fall Pledging',
            p: unshift(num(16))
        }, {
            n: 'Conclave',
            p: unshift(num(33))
        }, {
            n: 'Open House',
            p: unshift(num(68))
        }
    ],
    p: unshift(num(15))
},
{
    n: '2009',
    a: [{
            n: 'Birthday Halloween',
            p: unshift(num(288))
        }, {
            n: 'Fall Rush Week',
            p: unshift(num(194))
        }, {
            n: 'Girl Scout Day',
            p: unshift(num(23))
        }, {
            n: 'Open House',
            p: unshift(num(359))
        }, {
            n: 'Demo Club',
            p: unshift(num(11))
        }
    ]
},
{
    n: '2008',
    a: [{
            n: 'Exploding Jayhawk',
            p: unshift(num(48), new AlbumVideo('Z3BLBK8dnYg'))
        }, {
            n: 'Charlie Brown',
            p: unshift(num(58), new AlbumVideo('LE-xU1rDrK0'))
        }, {
            n: 'Bowling',
            p: unshift(num(13))
        }, {
            n: 'Boy Scout Day',
            p: unshift(num(13))
        }, {
            n: 'Open House',
            p: unshift(num(29))
        }, {
            n: 'Random',
            p: unshift(num(38))
        }
    ]
},
{
    n: '2007',
    a: [{
            n: 'Marlatt Show',
            p: unshift(num(11))
        }, {
            n: 'Photo Scavenger Hunt',
            p: unshift(num(3))
        }, {
            n: 'Mini Golf',
            p: unshift(num(18))
        }, {
            n: 'Shows',
            p: unshift(num(6))
        }
    ]
},
{
    n: '2006',
    a: [{
            n: 'Haunted Hunt',
            p: unshift(num(49))
        }, {
            n: 'Boy Scout Day',
            p: unshift(num(39))
        }, {
            n: 'Bowling',
            p: unshift(num(11))
        }, {
            n: 'Shows',
            p: unshift(num(15))
        }
    ],
    p: unshift(num(4))
},
{
    n: '2005',
    p: unshift(num(3))
}
/* End Initialize Albums */
            ]
        };
    }
})(jQuery, ko);