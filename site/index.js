var isKSU = (window.location.origin || window.location.host || window.location.hostname).indexOf("k-state.edu") !== -1;
var Officer, Member, PledgeClass, Family, Album, AlbumPicture, AlbumVideo, Faq, ViewModel;
(function($, ko){
    "use strict";
    // Knockout extensions
    (function(){
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
    var families = ["Gold", "Silver", "Copper", "Iron", "Mercury", "Lead", "Tin"];
    (function createViewModels(){
        var littleSorting = {sort:{get:function(obj){return obj.date;}}};
        var familiesIndex = {};
        for (var i = 0; i < families.length; ++i){
            familiesIndex[families[i]] = i;
        }
        var pledgeClassSorting = {sort:{get:function(obj){return new Date(obj.semester)}}};
        var pledgeClassMemberSorting = {sort:{get: function(member){return (member.family ? familiesIndex[member.family] : 9) + "-" + member.name;}}};
        Officer = function(position, name, email, picture, year, major, minor){
            var self = this;
            self.position = position;
            self.name = name;
            self.email = email;
            self.year = year;
            self.major = major;
            self.minor = minor;
            self.picture = picture;
        };
        Member = function(id, name, date, status, family, big, chapter) {
            var self = this;
            self.id = id;
            self.name = name;
            self.date = date;
            self.status = status;
            self.family = family;
            self.big = big;
            self.chapter = chapter;
            self.x = function() {};
            self.x.littles = ko.observableArray().extend(littleSorting);
        };
        PledgeClass = function(semester, picture){
            var self = this;
            self.semester = semester;
            self.picture = picture;
            self.memberList = ko.observableArray().extend(pledgeClassMemberSorting);
        };
        Family = function(name){
            var self = this;
            self.name = name;
            // Todo: bigs/littles
            self.memberList = ko.observableArray().extend(littleSorting);
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
            self.lastUpdated =
/* Don't manually update here! Run Update.ps1. */
/* Initialize Today */
new Date('12/01/2017 08:25:17Z');
/* End Initialize Today */
            self.officerList = [];
            self.memberList = [];
            self.pledgeClassAlbum = new Album();
            self.pledgeClassAlbum.path = "#/members/classes";
            self.familyAlbum = new Album();
            self.familyAlbum.path = "#/members/families";
            self.pledgeClassList = ko.observableArray().extend(pledgeClassSorting);
            self.familyList = [];
            self.albumList = [];
            self.faqList = [];
            
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
    var viewModel = new ViewModel();
    window.viewModel = viewModel;
    (function initializeOfficers(){
/* Don't manually update here! Update officers.csv and run Update.ps1. */
/* Initialize Officers */
viewModel.officerList.push(
new Officer('Master Alchemist', 'Patrick Gillespie', 'patrickj115@ksu.edu', 'images/officers/Patrick_Gillespie.jpg', 'Junior', 'Chemistry', ''),
new Officer('Vice Master Alchemist', 'Karter Krokstrom', 'kkrokstrom@ksu.edu', 'images/officers/noimage', 'Junior', 'Chemical Engineering', ''),
new Officer('Master of Ceremonies', 'Emily Wedeman', 'ewedeman@k-state.edu', 'images/officers/Emily_Wedeman.jpg', 'Junior', 'Chemical Engineering', ''),
new Officer('Outreach Coordinator', 'Lacey Beck', 'laceybeck2013@ksu.edu', 'images/officers/Lacey_Beck.jpg', 'Senior', 'Chemistry', ''),
new Officer('Assistant Outreach Coordinator', 'Muriel Eaton', 'meaton02@ksu.edu', 'images/officers/Muriel_Eaton.jpg', 'Senior', 'Biochemistry', ''),
new Officer('Social Chair', 'Marquix Adamson', 'marquix@ksu.edu', 'images/officers/Marquix_Adamson.jpg', 'Junior', 'Chemistry', ''),
new Officer('Recorder', 'Stephanie Lee', 'stephlee24@ksu.edu', 'images/officers/Sarah_Price.jpg', 'Senior', 'Chemical Science and Animal Bioscience', ''),
new Officer('Treasurer', 'Courtney Hess', 'chess25@ksu.edu', 'images/officers/noimage', 'Senior', 'Chemical Science and Animal Bioscience', ''),
new Officer('Historian', 'Sydney Masters', 'smasters@ksu.edu', 'images/officers/Sydney_Masters.jpg', 'Sophomore', 'Life Sciences, Pre-Optometry Major', ''),
new Officer('Reporter', 'Gabrielle Ciccarelli', 'grciccar@ksu.edu', 'images/officers/Gabrielle_Ciccarelli.jpg', 'Sophomore', 'Nutritional Science', ''),
new Officer('Webmaster', 'Vladislav Dubrovenski', 'vladi@ksu.edu', 'images/officers/Vladislav_Dubrovenski.jpg', 'Junior', 'Computer Science', ''),
new Officer('Alumni Secretary', 'Dustin Nelsen', 'dnelsen@ksu.edu', 'images/officers/noimage', 'Junior', '', ''),
new Officer('Chapter Advisor', 'Emery Brown', 'emerybrown@ksu.edu', 'images/officers/Emery_Brown.jpg', 'Graduate Student', 'Analytical Chemistry', ''));
/* End Initialize Officers */
    })();
    (function initializeMembers(){
/* Don't manually update here! Update members.csv and run Update.ps1. */
/* Initialize Members */
viewModel.memberList.push(
new Member('0', 'Cleon Arrington', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('1', 'Clifton Meloan', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('2', 'David Bak', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('3', 'David Irvin', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('4', 'Dennis Schmidt', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('5', 'Donald Parker', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('6', 'Donald Rathburn', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('7', 'Donald Setser', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('8', 'James Weber', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('9', 'Jarrel Anderson', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('10', 'John Dillard', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('11', 'John Hassler', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('12', 'Jorge Olguin', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('13', 'Lewis Shadoff', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('14', 'Robert Winter', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('15', 'Theodore Tabor', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('16', 'Wayne Stukey', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('17', 'Wendell Burch', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('18', 'Wilford Stewart', '5/16/1964', 'Inactive', '', '', '&Kappa;'),
new Member('19', 'James Mertz', '1/16/1965', 'Inactive', '', '', '&Kappa;'),
new Member('20', 'Kenneth Wolma', '1/16/1965', 'Inactive', '', '', '&Kappa;'),
new Member('21', 'Richard Johnson', '1/16/1965', 'Inactive', '', '', '&Kappa;'),
new Member('22', 'Richard Steppel', '1/16/1965', 'Inactive', '', '', '&Kappa;'),
new Member('23', 'Charles Foxx', '5/1/1965', 'Inactive', '', '', '&Kappa;'),
new Member('24', 'Gary Stolzenberg', '5/1/1965', 'Inactive', '', '', '&Kappa;'),
new Member('25', 'Lawrence Seibles', '5/1/1965', 'Inactive', '', '', '&Kappa;'),
new Member('26', 'Adrian Daane', '10/30/1965', 'Inactive', '', '', ''),
new Member('27', 'Andreas Vikis', '10/30/1965', 'Inactive', '', '', ''),
new Member('28', 'David Manzo', '10/30/1965', 'Inactive', '', '', ''),
new Member('29', 'Gerald Dohm', '10/30/1965', 'Inactive', '', '', ''),
new Member('30', 'James Barnhart', '10/30/1965', 'Inactive', '', '', ''),
new Member('31', 'John Hagfeldt', '10/30/1965', 'Inactive', '', '', ''),
new Member('32', 'John Kotz', '10/30/1965', 'Inactive', '', '', ''),
new Member('33', 'John O&39;Brien', '10/30/1965', 'Inactive', '', '', ''),
new Member('34', 'Myron Jacobson', '10/30/1965', 'Inactive', '', '', ''),
new Member('35', 'Peter Pospisil', '10/30/1965', 'Inactive', '', '', ''),
new Member('36', 'Ronald Lam', '10/30/1965', 'Inactive', '', '', ''),
new Member('37', 'Gerald Davis', '5/21/1966', 'Inactive', '', '', ''),
new Member('38', 'James Curtis', '5/21/1966', 'Inactive', '', '', ''),
new Member('39', 'Richard Sullivan', '5/21/1966', 'Inactive', '', '', ''),
new Member('40', 'Robert Adams', '5/21/1966', 'Inactive', '', '', ''),
new Member('41', 'Andy Sae', '12/10/1966', 'Inactive', '', '', ''),
new Member('42', 'Claude Shinn', '12/10/1966', 'Inactive', '', '', ''),
new Member('43', 'Normal Craig', '12/10/1966', 'Inactive', '', '', ''),
new Member('44', 'Yadagiri Magavalli', '12/10/1966', 'Inactive', '', '', ''),
new Member('45', 'Eric Patterson', '3/13/1967', 'Inactive', '', '', ''),
new Member('46', 'James Lawless', '3/13/1967', 'Inactive', '', '', ''),
new Member('47', 'R. Jambunathan', '3/13/1967', 'Inactive', '', '', ''),
new Member('48', 'Stephen Mayfield', '3/13/1967', 'Inactive', '', '', ''),
new Member('49', 'Woei-Tih Huang', '3/13/1967', 'Inactive', '', '', ''),
new Member('50', 'Allan Ford', '5/13/1967', 'Inactive', '', '', ''),
new Member('51', 'David Roerig', '5/13/1967', 'Inactive', '', '', ''),
new Member('52', 'Don Morris', '5/13/1967', 'Inactive', '', '', ''),
new Member('53', 'Gary Muschik', '5/13/1967', 'Inactive', '', '', ''),
new Member('54', 'Nelson Wolfe', '5/13/1967', 'Inactive', '', '', ''),
new Member('55', 'Oliver Brown', '5/13/1967', 'Inactive', '', '', ''),
new Member('56', 'Ronald Madl', '5/13/1967', 'Inactive', '', '', ''),
new Member('57', 'Donald Hill', '12/9/1967', 'Inactive', '', '', ''),
new Member('58', 'Harold Wells', '12/9/1967', 'Inactive', '', '', ''),
new Member('59', 'Jar-Lin Kao', '12/9/1967', 'Inactive', '', '', ''),
new Member('60', 'Jeffrey Meyer', '12/9/1967', 'Inactive', '', '', ''),
new Member('61', 'Larry Seitz', '12/9/1967', 'Inactive', '', '', ''),
new Member('62', 'Robert Reitz', '12/9/1967', 'Inactive', '', '', ''),
new Member('63', 'Frederick Reynolds Jr.', '5/25/1968', 'Inactive', '', '', ''),
new Member('64', 'Nam Kuan', '5/25/1968', 'Inactive', '', '', ''),
new Member('65', 'Tyng-Fang Chien', '5/25/1968', 'Inactive', '', '', ''),
new Member('66', 'William Clark', '5/25/1968', 'Inactive', '', '', ''),
new Member('67', 'Robert Zanden', '1/9/1970', 'Inactive', '', '', ''),
new Member('68', 'Donald Bath', '5/9/1970', 'Inactive', '', '', ''),
new Member('69', 'James Richmond', '5/9/1970', 'Inactive', '', '', ''),
new Member('70', 'Robert Hale', '5/9/1970', 'Inactive', '', '', ''),
new Member('71', 'Ronald Albrecht', '5/9/1970', 'Inactive', '', '', ''),
new Member('72', 'William Friz', '5/9/1970', 'Inactive', '', '', ''),
new Member('73', 'Allan Childs', '1/30/1971', 'Inactive', '', '', ''),
new Member('74', 'Michael Rennekamp', '1/30/1971', 'Inactive', '', '', ''),
new Member('75', 'Raymond Blake', '1/30/1971', 'Inactive', '', '', ''),
new Member('76', 'Robert Bjercke', '1/30/1971', 'Inactive', '', '', ''),
new Member('77', 'Robert Jilka', '1/30/1971', 'Inactive', '', '', ''),
new Member('78', 'Yukio Kakuda', '1/30/1971', 'Inactive', '', '', ''),
new Member('79', 'David Ebert', '2/5/1972', 'Inactive', '', '', ''),
new Member('80', 'David Heying', '2/5/1972', 'Inactive', '', '', ''),
new Member('81', 'Paul Marcoux', '2/5/1972', 'Inactive', '', '', ''),
new Member('82', 'Bruce Durkee', '2/3/1973', 'Inactive', '', '', ''),
new Member('83', 'Cindy Newberry Childs', '2/3/1973', 'Inactive', '', '', ''),
new Member('84', 'Frederick Esch', '2/3/1973', 'Inactive', '', '', ''),
new Member('85', 'John Kirby', '2/3/1973', 'Inactive', '', '', ''),
new Member('86', 'Richard Everson', '2/3/1973', 'Inactive', '', '', ''),
new Member('87', 'Robert Moore', '2/3/1973', 'Inactive', '', '', ''),
new Member('88', 'Robert Onnen', '2/3/1973', 'Inactive', '', '', ''),
new Member('89', 'Robin Robins', '2/3/1973', 'Inactive', '', '', ''),
new Member('90', 'Robert, Jr. Mobley', '9/29/1973', 'Inactive', '', '', ''),
new Member('91', 'Ronald Kittle', '9/29/1973', 'Inactive', '', '', ''),
new Member('92', 'Sarah Kirton', '9/29/1973', 'Inactive', '', '', ''),
new Member('93', 'Arthur Metcalf', '2/16/1974', 'Inactive', '', '', ''),
new Member('94', 'Clinton Tolles', '2/16/1974', 'Inactive', '', '', ''),
new Member('95', 'Frank McClelland', '2/16/1974', 'Inactive', '', '', ''),
new Member('96', 'J. Enrique Velasco', '2/16/1974', 'Inactive', '', '', ''),
new Member('97', 'Jane Larsen', '2/16/1974', 'Inactive', '', '', ''),
new Member('98', 'Joseph Smith', '2/16/1974', 'Inactive', '', '', ''),
new Member('99', 'Ken Guyer', '2/16/1974', 'Inactive', '', '', ''),
new Member('100', 'Richard Entz', '2/16/1974', 'Inactive', '', '', ''),
new Member('101', 'Robert Miller', '2/16/1974', 'Inactive', '', '', ''),
new Member('102', 'Royce Alexander', '2/16/1974', 'Inactive', '', '', ''),
new Member('103', 'Geri Richmond', '4/19/1974', 'Inactive', '', '', ''),
new Member('104', 'Margaret Asirvatham', '4/19/1974', 'Inactive', '', '', ''),
new Member('105', 'Chris Duddard Rainey', '2/15/1975', 'Inactive', '', '', ''),
new Member('106', 'Jeffrey Dancer', '2/15/1975', 'Inactive', '', '', ''),
new Member('107', 'Madhuri K. Raut', '2/15/1975', 'Inactive', '', '', ''),
new Member('108', 'Richard Warner', '2/15/1975', 'Inactive', '', '', ''),
new Member('109', 'Roderick Bruckdorfer', '2/15/1975', 'Inactive', '', '', ''),
new Member('110', 'Steven Wallace', '2/15/1975', 'Inactive', '', '', ''),
new Member('111', 'Stuart Whitlock', '2/15/1975', 'Inactive', '', '', ''),
new Member('112', 'Wesley Workman', '2/15/1975', 'Inactive', '', '', ''),
new Member('113', 'Cadre Griffin', '4/24/1976', 'Inactive', '', '', ''),
new Member('114', 'Carolyn Kapplemann', '4/24/1976', 'Inactive', '', '', ''),
new Member('115', 'Dennis Nuzback', '4/24/1976', 'Inactive', '', '', ''),
new Member('116', 'Eddie Lustgarten', '4/24/1976', 'Inactive', '', '', ''),
new Member('117', 'Max A. Jones', '4/24/1976', 'Inactive', '', '', ''),
new Member('118', 'Jimmy Weishaar', '12/4/1976', 'Inactive', '', '', ''),
new Member('119', 'Kent Thomas', '12/4/1976', 'Inactive', '', '', ''),
new Member('120', 'Ronald Kodras', '12/4/1976', 'Inactive', '', '', ''),
new Member('121', 'Brian Hettrick', '4/30/1977', 'Inactive', '', '', ''),
new Member('122', 'Donna Triebe', '4/30/1977', 'Inactive', '', '', ''),
new Member('123', 'Harry Stenvall', '4/30/1977', 'Inactive', '', '', ''),
new Member('124', 'John Legere', '4/30/1977', 'Inactive', '', '', ''),
new Member('125', 'Paula Ravnikar', '4/30/1977', 'Inactive', '', '', ''),
new Member('126', 'Carol Malin', '10/22/1977', 'Inactive', '', '', ''),
new Member('127', 'Chris Null', '10/22/1977', 'Inactive', '', '', ''),
new Member('128', 'Christopher Southwick', '10/22/1977', 'Inactive', '', '', ''),
new Member('129', 'Dana Mathes', '10/22/1977', 'Inactive', '', '', ''),
new Member('130', 'Deborah Owen', '10/22/1977', 'Inactive', '', '', ''),
new Member('131', 'John Marks III', '10/22/1977', 'Inactive', '', '', ''),
new Member('132', 'Joseph Dietz', '10/22/1977', 'Inactive', '', '', ''),
new Member('133', 'Monty McCoy', '10/22/1977', 'Inactive', '', '', ''),
new Member('134', 'Pamela Brown', '10/22/1977', 'Inactive', '', '', ''),
new Member('135', 'Sookyong Kwak', '10/22/1977', 'Inactive', '', '', ''),
new Member('136', 'Micaela Engel', '11/22/1977', 'Inactive', '', '', ''),
new Member('137', 'Cynthia Schaller', '4/29/1978', 'Inactive', '', '', ''),
new Member('138', 'Frederick Triebe', '4/29/1978', 'Inactive', '', '', ''),
new Member('139', 'Kathy Gromer', '4/29/1978', 'Inactive', '', '', ''),
new Member('140', 'Larry Erickson', '4/29/1978', 'Inactive', '', '', ''),
new Member('141', 'Steven Roof', '4/29/1978', 'Inactive', '', '', ''),
new Member('142', 'Wayne Svoboda', '4/29/1978', 'Inactive', '', '', ''),
new Member('143', 'Alicia de Francisco', '3/24/1979', 'Inactive', '', '', ''),
new Member('144', 'Madakasira Subramanyam', '3/24/1979', 'Inactive', '', '', ''),
new Member('145', 'Michael Gilmore', '3/24/1979', 'Inactive', '', '', ''),
new Member('146', 'Michael Patrick Sharon', '3/24/1979', 'Inactive', '', '', ''),
new Member('147', 'Patrick McCluskey', '3/24/1979', 'Inactive', '', '', ''),
new Member('148', 'Rebecca Kenyon', '3/24/1979', 'Inactive', '', '', ''),
new Member('149', 'William Wiatt', '3/24/1979', 'Inactive', '', '', ''),
new Member('150', 'Alan Adam', '12/1/1979', 'Inactive', '', '', ''),
new Member('151', 'Bruce Randall Sebree', '12/1/1979', 'Inactive', '', '', ''),
new Member('152', 'Cynthia Claire (Hughes) Semple', '12/1/1979', 'Inactive', '', '', ''),
new Member('153', 'Harry Clark III', '12/1/1979', 'Inactive', '', '', ''),
new Member('154', 'Jerry Foropoulos Jr.', '12/1/1979', 'Inactive', '', '', ''),
new Member('155', 'Jonelle Palmer', '12/1/1979', 'Inactive', '', '', ''),
new Member('156', 'Paul Reddy', '12/1/1979', 'Inactive', '', '', ''),
new Member('157', 'Pradeep Iyer', '12/1/1979', 'Inactive', '', '', ''),
new Member('158', 'Randy Wehling', '12/1/1979', 'Inactive', '', '', ''),
new Member('159', 'James Gundersen', '12/6/1980', 'Inactive', '', '', ''),
new Member('160', 'Joseph Jilka', '12/6/1980', 'Inactive', '', '', ''),
new Member('161', 'Joseph Sack', '12/6/1980', 'Inactive', '', '', ''),
new Member('162', 'Prakash Rangnekar', '12/6/1980', 'Inactive', '', '', ''),
new Member('163', 'Rajendra Kulkarni', '12/6/1980', 'Inactive', '', '', ''),
new Member('164', 'Theodore Olson, Jr.', '12/6/1980', 'Inactive', '', '', ''),
new Member('165', 'Brian O&39;Brien', '12/5/1981', 'Inactive', '', '', ''),
new Member('166', 'Jeffrey Levin', '12/5/1981', 'Inactive', '', '', ''),
new Member('167', 'Anthony Schleisman', '11/6/1982', 'Inactive', '', '', ''),
new Member('168', 'Barton Bender', '11/6/1982', 'Inactive', '', '', ''),
new Member('169', 'Brent Fulton', '11/6/1982', 'Inactive', '', '', ''),
new Member('170', 'Dale Wheeler', '11/6/1982', 'Inactive', '', '', ''),
new Member('171', 'John Graham', '11/6/1982', 'Inactive', '', '', ''),
new Member('172', 'John Keane', '11/6/1982', 'Inactive', '', '', ''),
new Member('173', 'Michael Kramer', '11/6/1982', 'Inactive', '', '', ''),
new Member('174', 'Michael Wichman', '11/6/1982', 'Inactive', '', '', ''),
new Member('175', 'Robert C. Fry', '11/6/1982', 'Inactive', '', '', ''),
new Member('176', 'Robert Zoellner', '11/6/1982', 'Inactive', '', '', ''),
new Member('177', 'Allan W. Olsen', '4/23/1983', 'Inactive', '', '', ''),
new Member('178', 'David Devore', '4/23/1983', 'Inactive', '', '', ''),
new Member('179', 'Dean Vangalen', '4/23/1983', 'Inactive', '', '', ''),
new Member('180', 'Edward King', '4/23/1983', 'Inactive', '', '', ''),
new Member('181', 'Jeffry Ramsey', '4/23/1983', 'Inactive', '', '', ''),
new Member('182', 'Jennifer Bradford', '4/23/1983', 'Inactive', '', '', ''),
new Member('183', 'Joen (Steward) Schleisman', '4/23/1983', 'Inactive', '', '', ''),
new Member('184', 'Nancy Friederich', '4/23/1983', 'Inactive', '', '', ''),
new Member('185', 'R. David Jones', '4/23/1983', 'Inactive', '', '', ''),
new Member('186', 'Robert C. Lehman', '4/23/1983', 'Inactive', '', '', ''),
new Member('187', 'Ronald Fietkau', '4/23/1983', 'Inactive', '', '', ''),
new Member('188', 'Sanjay Wategaonkar', '4/23/1983', 'Inactive', '', '', ''),
new Member('189', 'Ven Shing Wang', '4/23/1983', 'Inactive', '', '', ''),
new Member('190', 'Alison Ann Fleming', '4/14/1984', 'Inactive', '', '', ''),
new Member('191', 'Calvin Mok-Yeun Tong', '4/14/1984', 'Inactive', '', '', ''),
new Member('192', 'David John Elliot', '4/14/1984', 'Inactive', '', '', ''),
new Member('193', 'David McCurdy', '4/14/1984', 'Inactive', '', '', ''),
new Member('194', 'Don Pivonka', '4/14/1984', 'Inactive', '', '', ''),
new Member('195', 'Jeffrey Streets', '4/14/1984', 'Inactive', '', '', ''),
new Member('196', 'Joseph Lichtenhan', '4/14/1984', 'Inactive', '', '', ''),
new Member('197', 'Karen (Klozenbucher) Wilson', '4/14/1984', 'Inactive', '', '', ''),
new Member('198', 'Melinda (Stevenson) Marquess', '4/14/1984', 'Inactive', '', '', ''),
new Member('199', 'Peggy J. McCann', '4/14/1984', 'Inactive', '', '', ''),
new Member('200', 'Rodney Cundiff', '4/14/1984', 'Inactive', '', '', ''),
new Member('201', 'Ana (Lisano) Hooker', '10/27/1984', 'Inactive', '', '', ''),
new Member('202', 'Barbara Markley', '10/27/1984', 'Inactive', '', '', ''),
new Member('203', 'David Macomber', '10/27/1984', 'Inactive', '', '', ''),
new Member('204', 'Eldon Smith', '10/27/1984', 'Inactive', '', '', ''),
new Member('205', 'Ibraheem Taiwo Badejo', '10/27/1984', 'Inactive', '', '', ''),
new Member('206', 'Jeffrey Edward Fox', '10/27/1984', 'Inactive', '', '', ''),
new Member('207', 'Joanna Czuchajowska', '10/27/1984', 'Inactive', '', '', ''),
new Member('208', 'Kimberly (Franz) Walker', '10/27/1984', 'Inactive', '', '', ''),
new Member('209', 'Mark Jordan', '10/27/1984', 'Inactive', '', '', ''),
new Member('210', 'Matthew Franklin', '10/27/1984', 'Inactive', '', '', ''),
new Member('211', 'Michael Conry', '10/27/1984', 'Inactive', '', '', ''),
new Member('212', 'Robert Freeman', '10/27/1984', 'Inactive', '', '', ''),
new Member('213', 'Thomas James Jewett', '10/27/1984', 'Inactive', '', '', ''),
new Member('214', 'Brenda (Smith) Rolfe', '4/13/1985', 'Inactive', '', '', ''),
new Member('215', 'Brock A. Luty', '4/13/1985', 'Inactive', '', '', ''),
new Member('216', 'Bryce Wisemiller', '4/13/1985', 'Inactive', '', '', ''),
new Member('217', 'Darcie Bailey', '4/13/1985', 'Inactive', '', '', ''),
new Member('218', 'David Ellis', '4/13/1985', 'Inactive', '', '', ''),
new Member('219', 'Eric Trump', '4/13/1985', 'Inactive', '', '', ''),
new Member('220', 'Guy Wilson', '4/13/1985', 'Inactive', '', '', ''),
new Member('221', 'Jeffrey McKie', '4/13/1985', 'Inactive', '', '', ''),
new Member('222', 'Jennifer Bales', '4/13/1985', 'Inactive', '', '', ''),
new Member('223', 'Mary Rezac', '4/13/1985', 'Inactive', '', '', ''),
new Member('224', 'Renee (Tevis) Smith', '4/13/1985', 'Inactive', '', '', ''),
new Member('225', 'Scott Bledsoe', '4/13/1985', 'Inactive', '', '', ''),
new Member('226', 'Albert Avila', '10/26/1985', 'Inactive', '', '', ''),
new Member('227', 'Anita Specht', '10/26/1985', 'Inactive', '', '', ''),
new Member('228', 'Beth Thomas', '10/26/1985', 'Inactive', '', '', ''),
new Member('229', 'Deborah (Dunz) Dozier', '10/26/1985', 'Inactive', '', '', ''),
new Member('230', 'Deborah Montgomery', '10/26/1985', 'Inactive', '', '', ''),
new Member('231', 'Janice Pinard', '10/26/1985', 'Inactive', '', '', ''),
new Member('232', 'John D. Peck', '10/26/1985', 'Inactive', '', '', ''),
new Member('233', 'Karren Church', '10/26/1985', 'Inactive', '', '', ''),
new Member('234', 'Laura Berry', '10/26/1985', 'Inactive', '', '', ''),
new Member('235', 'Lisa Eisele', '10/26/1985', 'Inactive', '', '', ''),
new Member('236', 'Martin Olberding', '10/26/1985', 'Inactive', '', '', ''),
new Member('237', 'Michelle Nee', '10/26/1985', 'Inactive', '', '', ''),
new Member('238', 'Obed N. Saint-Louis', '10/26/1985', 'Inactive', '', '', ''),
new Member('239', 'Sarah Roberts', '10/26/1985', 'Inactive', '', '', ''),
new Member('240', 'Steven Kohler', '10/26/1985', 'Inactive', '', '', ''),
new Member('241', 'Thomas Dean Zepp', '10/26/1985', 'Inactive', '', '', ''),
new Member('242', 'Todd Bielefeld', '10/26/1985', 'Inactive', '', '', ''),
new Member('243', 'Vincent Avila', '10/26/1985', 'Inactive', '', '', ''),
new Member('244', 'Barbara (Peirano) Spartz', '4/19/1986', 'Inactive', '', '', ''),
new Member('245', 'Becky (Fritsch) Leary', '4/19/1986', 'Inactive', '', '', ''),
new Member('246', 'Charles Butterfield', '4/19/1986', 'Inactive', '', '', ''),
new Member('247', 'Chris A. Schueler', '4/19/1986', 'Inactive', '', '', ''),
new Member('248', 'Donald Risley', '4/19/1986', 'Inactive', '', '', ''),
new Member('249', 'Elizabeth Wedeman', '4/19/1986', 'Inactive', '', '', ''),
new Member('250', 'George Mavridis', '4/19/1986', 'Inactive', '', '', ''),
new Member('251', 'Prakash Venkatesan', '4/19/1986', 'Inactive', '', '', ''),
new Member('252', 'Suchada Utamapanya', '4/19/1986', 'Inactive', '', '', ''),
new Member('253', 'Susan K. (Antrim) Feldhausen', '4/19/1986', 'Inactive', '', '', ''),
new Member('254', 'Allan Bohlke', '11/1/1986', 'Inactive', '', '', ''),
new Member('255', 'Curt H. Drennen', '11/1/1986', 'Inactive', '', '', ''),
new Member('256', 'Dale Coffin', '11/1/1986', 'Inactive', '', '', ''),
new Member('257', 'Donovan Miller', '11/1/1986', 'Inactive', '', '', ''),
new Member('258', 'Martin Spartz', '11/1/1986', 'Inactive', '', '', ''),
new Member('259', 'Thanh Dao', '11/1/1986', 'Inactive', '', '', ''),
new Member('260', 'Diane Hodges', '4/11/1987', 'Inactive', '', '', ''),
new Member('261', 'Joseph Richter', '4/11/1987', 'Inactive', '', '', ''),
new Member('262', 'Karyne Lynn (Luborne) Kern', '4/11/1987', 'Inactive', '', '', ''),
new Member('263', 'Mark Edward Rychlec', '4/11/1987', 'Inactive', '', '', ''),
new Member('264', 'Matthew Dassow', '4/11/1987', 'Inactive', '', '', ''),
new Member('265', 'Michelle Ruth Herman', '4/11/1987', 'Inactive', '', '', ''),
new Member('266', 'Sharon Brown', '4/11/1987', 'Inactive', '', '', ''),
new Member('267', 'Susan E. Goedecke', '4/11/1987', 'Inactive', '', '', ''),
new Member('268', 'Susan M. Smith', '4/11/1987', 'Inactive', '', '', ''),
new Member('269', 'Tracy Gulick', '4/11/1987', 'Inactive', '', '', ''),
new Member('270', 'Warren Kennedy', '4/11/1987', 'Inactive', '', '', ''),
new Member('271', 'William Patry', '4/11/1987', 'Inactive', '', '', ''),
new Member('272', 'Annette (Allen) Bollig', '10/31/1987', 'Inactive', '', '', ''),
new Member('273', 'James Everett Ruland', '10/31/1987', 'Inactive', '', '', ''),
new Member('274', 'Jay Irsik', '10/31/1987', 'Inactive', '', '', ''),
new Member('275', 'Jeff Debord', '10/31/1987', 'Inactive', '', '', ''),
new Member('276', 'Leigh Ann Kuhn', '10/31/1987', 'Inactive', '', '', ''),
new Member('277', 'Michael James Chisam', '10/31/1987', 'Inactive', '', '', ''),
new Member('278', 'Nancy Berry', '10/31/1987', 'Inactive', '', '', ''),
new Member('279', 'Randy Lynn Milford', '10/31/1987', 'Inactive', '', '', ''),
new Member('280', 'Sally Elizabeth Eckert', '10/31/1987', 'Inactive', '', '', ''),
new Member('281', 'Steven M. Hoynowski', '10/31/1987', 'Inactive', '', '', ''),
new Member('282', 'Debra Neel', '4/8/1988', 'Inactive', '', '', ''),
new Member('283', 'George Guise Jr.', '4/8/1988', 'Inactive', '', '', ''),
new Member('284', 'Henny Kesuma Sudirgio', '4/8/1988', 'Inactive', '', '', ''),
new Member('285', 'James Tate', '4/8/1988', 'Inactive', '', '', ''),
new Member('286', 'Julie (Bostater) Cox', '4/8/1988', 'Inactive', '', '', ''),
new Member('287', 'Leah (McCoy) Perry', '4/8/1988', 'Inactive', '', '', ''),
new Member('288', 'Leroy Page', '4/8/1988', 'Inactive', '', '', ''),
new Member('289', 'Michael Armour', '4/8/1988', 'Inactive', '', '', ''),
new Member('290', 'Shelli Letellier', '4/8/1988', 'Inactive', '', '', ''),
new Member('291', 'Tracy Skipton', '4/8/1988', 'Inactive', '', '', ''),
new Member('292', 'Vick Flowers', '4/8/1988', 'Inactive', '', '', ''),
new Member('293', 'Amy Taylor', '10/21/1988', 'Inactive', '', '', ''),
new Member('294', 'Andrew Lammers', '10/21/1988', 'Inactive', '', '', ''),
new Member('295', 'Barbara (Sly) Montgomery', '10/21/1988', 'Inactive', '', '', ''),
new Member('296', 'Cinthia (Green) Priest', '10/21/1988', 'Inactive', '', '', ''),
new Member('297', 'Daniel Prohaska', '10/21/1988', 'Inactive', '', '', ''),
new Member('298', 'Hank Lipps', '10/21/1988', 'Inactive', '', '', ''),
new Member('299', 'Karen A. Veverka', '10/21/1988', 'Inactive', '', '', ''),
new Member('300', 'Kristen Pforr', '10/21/1988', 'Inactive', '', '', ''),
new Member('301', 'Kristin (Good) Pforr', '10/21/1988', 'Inactive', '', '', ''),
new Member('302', 'L. Alayne (Ward) Burton', '10/21/1988', 'Inactive', '', '', ''),
new Member('303', 'Landra Kaye Gukeisen', '10/21/1988', 'Inactive', '', '', ''),
new Member('304', 'Mark Witkowski', '10/21/1988', 'Inactive', '', '', ''),
new Member('305', 'Suzanne Smykacs', '10/21/1988', 'Inactive', '', '', ''),
new Member('306', 'Ana (Bravo) Hooker', '4/14/1989', 'Inactive', '', '', ''),
new Member('307', 'Joe Rahija', '4/14/1989', 'Inactive', '', '', ''),
new Member('308', 'Kurt Pyle', '4/14/1989', 'Inactive', '', '', ''),
new Member('309', 'Pamela Stewart', '4/14/1989', 'Inactive', '', '', ''),
new Member('310', 'Cameron Epard', '11/10/1989', 'Inactive', '', '', ''),
new Member('311', 'Cory Gabel', '11/10/1989', 'Inactive', '', '', ''),
new Member('312', 'Csilla Duneczky', '11/10/1989', 'Inactive', '', '', ''),
new Member('313', 'Curtis Eric Grey', '11/10/1989', 'Inactive', '', '', ''),
new Member('314', 'Jennifer Wagner', '11/10/1989', 'Inactive', '', '', ''),
new Member('315', 'Jon Moore', '11/10/1989', 'Inactive', '', '', ''),
new Member('316', 'Justin Murphy', '11/10/1989', 'Inactive', '', '', ''),
new Member('317', 'Michael Raile', '11/10/1989', 'Inactive', '', '', ''),
new Member('318', 'Sergio A. Jimenez', '11/10/1989', 'Inactive', '', '', ''),
new Member('319', 'Gary Mallon', '4/20/1990', 'Inactive', '', '', ''),
new Member('320', 'Jean Schrader', '4/20/1990', 'Inactive', '', '', ''),
new Member('321', 'Robert A. Matejicka, Jr.', '4/20/1990', 'Inactive', '', '', ''),
new Member('322', 'Robert Leach', '4/20/1990', 'Inactive', '', '', ''),
new Member('323', 'Teresa (Rush) Scheuerman', '4/20/1990', 'Inactive', '', '', ''),
new Member('324', 'William Schluben', '4/20/1990', 'Inactive', '', '', ''),
new Member('325', 'Cheryl (Hodges) Marcotte', '11/30/1990', 'Inactive', '', '', ''),
new Member('326', 'Jennifer Reimer', '11/30/1990', 'Inactive', '', '', ''),
new Member('327', 'Veronica Tuttle', '11/30/1990', 'Inactive', '', '', ''),
new Member('328', 'Bill Weatherford', '4/12/1991', 'Inactive', '', '', ''),
new Member('329', 'Jeffrey Zoelle', '4/12/1991', 'Inactive', '', '', ''),
new Member('330', 'Michael Riblett', '4/12/1991', 'Inactive', '', '', ''),
new Member('331', 'Thomas Nielsen', '4/12/1991', 'Inactive', '', '', ''),
new Member('332', 'Virginia (Dahl) Makepeace', '4/12/1991', 'Inactive', '', '', ''),
new Member('333', 'Heather Adams', '11/22/1991', 'Inactive', '', '', ''),
new Member('334', 'Jessica Beal', '11/22/1991', 'Inactive', '', '', ''),
new Member('335', 'Kathy (Alexander) Rasmussen', '11/22/1991', 'Inactive', '', '', ''),
new Member('336', 'Kiersten Saal', '11/22/1991', 'Inactive', '', '', ''),
new Member('337', 'Lana Knedlik', '11/22/1991', 'Inactive', '', '', ''),
new Member('338', 'Rachel (Hamman) Benjamin', '11/22/1991', 'Inactive', '', '', ''),
new Member('339', 'Richard Hilgenfeld', '11/22/1991', 'Inactive', '', '', ''),
new Member('340', 'Ryan Cole', '11/22/1991', 'Inactive', '', '', ''),
new Member('341', 'Scott Smiley', '11/22/1991', 'Inactive', '', '', ''),
new Member('342', 'Shawn Bauer', '11/22/1991', 'Inactive', '', '', ''),
new Member('343', 'Stacy (Mull) Balzer', '11/22/1991', 'Inactive', '', '', ''),
new Member('344', 'Todd B. Meier', '11/22/1991', 'Inactive', '', '', ''),
new Member('345', 'Daniel A. Sommers', '4/24/1992', 'Inactive', '', '', ''),
new Member('346', 'James Pletcher', '4/24/1992', 'Inactive', '', '', ''),
new Member('347', 'Jarad Daniels', '4/24/1992', 'Inactive', '', '', ''),
new Member('348', 'Jason Smee', '4/24/1992', 'Inactive', '', '', ''),
new Member('349', 'Jonathan Newton', '4/24/1992', 'Inactive', '', '', ''),
new Member('350', 'Mike Rooke', '4/24/1992', 'Inactive', '', '', ''),
new Member('351', 'Barbara Gray', '11/13/1992', 'Inactive', '', '', ''),
new Member('352', 'Brandy Meyer', '11/13/1992', 'Inactive', '', '', ''),
new Member('353', 'Clayton Lowe', '11/13/1992', 'Inactive', '', '', ''),
new Member('354', 'Craig Behnke', '11/13/1992', 'Inactive', '', '', ''),
new Member('355', 'Kevin Stokes', '11/13/1992', 'Inactive', '', '', ''),
new Member('356', 'Melissa Simms', '11/13/1992', 'Inactive', '', '', ''),
new Member('357', 'Nicholas Alex Ruth', '11/13/1992', 'Inactive', '', '', ''),
new Member('358', 'Pamela (Howell) Goble', '11/13/1992', 'Inactive', '', '', ''),
new Member('359', 'Scott Rottinghaus', '11/13/1992', 'Inactive', '', '', ''),
new Member('360', 'Brandon Newell', '4/16/1993', 'Inactive', '', '', ''),
new Member('361', 'Bryce Williams', '4/16/1993', 'Inactive', '', '', ''),
new Member('362', 'Carrie Brucken', '4/16/1993', 'Inactive', '', '', ''),
new Member('363', 'Cheryl Wendell', '4/16/1993', 'Inactive', '', '', ''),
new Member('364', 'Cody C. Shrader', '4/16/1993', 'Inactive', '', '', ''),
new Member('365', 'Heather (Veith) Rectanus', '4/16/1993', 'Inactive', '', '', ''),
new Member('366', 'Jan Arbogast', '4/16/1993', 'Inactive', '', '', ''),
new Member('367', 'Jason Dana', '4/16/1993', 'Inactive', '', '', ''),
new Member('368', 'Joey Schriner', '4/16/1993', 'Inactive', '', '', ''),
new Member('369', 'John Schimke', '4/16/1993', 'Inactive', '', '', ''),
new Member('370', 'Tim Hubin', '4/16/1993', 'Inactive', '', '', ''),
new Member('371', 'Anita Freed', '11/19/1993', 'Inactive', '', '', ''),
new Member('372', 'Gregory Latham', '11/19/1993', 'Inactive', '', '', ''),
new Member('373', 'James L. Neff', '11/19/1993', 'Inactive', '', '', ''),
new Member('374', 'Marlo Hoffman', '11/19/1993', 'Inactive', '', '', ''),
new Member('375', 'Nancy Anderson', '11/19/1993', 'Inactive', '', '', ''),
new Member('376', 'Daniel Krische', '4/29/1994', 'Inactive', '', '', ''),
new Member('377', 'David Droegemueller', '4/29/1994', 'Inactive', '', '', ''),
new Member('378', 'Joseph Schmidt', '4/29/1994', 'Inactive', '', '', ''),
new Member('379', 'Chad Magee', '11/18/1994', 'Inactive', '', '', ''),
new Member('380', 'Emily Walker', '11/18/1994', 'Inactive', '', '', ''),
new Member('381', 'Steven Lonard', '11/18/1994', 'Inactive', '', '', ''),
new Member('382', 'Andreas Dowling', '4/21/1995', 'Inactive', '', '', ''),
new Member('383', 'Christopher Mack', '4/21/1995', 'Inactive', '', '', ''),
new Member('384', 'Darin Elliott', '4/21/1995', 'Inactive', '', '', ''),
new Member('385', 'Edward Pokorski', '4/21/1995', 'Inactive', '', '', ''),
new Member('386', 'Jill Goering', '4/21/1995', 'Inactive', '', '', ''),
new Member('387', 'Julie Crabtree', '4/21/1995', 'Inactive', '', '', ''),
new Member('388', 'Kevin Diehl', '4/21/1995', 'Inactive', '', '', ''),
new Member('389', 'Robert J. Rounbehler', '4/21/1995', 'Inactive', '', '', ''),
new Member('390', 'Sally Kay Wallis', '4/21/1995', 'Inactive', '', '', ''),
new Member('391', 'Scott C. Warren', '4/21/1995', 'Inactive', '', '', ''),
new Member('392', 'Andrew McLenon', '12/1/1995', 'Inactive', '', '', ''),
new Member('393', 'Anna Riblett', '12/1/1995', 'Inactive', '', '', ''),
new Member('394', 'Bonna Cannon', '12/1/1995', 'Inactive', '', '', ''),
new Member('395', 'Claude Story', '12/1/1995', 'Inactive', '', '', ''),
new Member('396', 'Colin Kilbane', '12/1/1995', 'Inactive', '', '', ''),
new Member('397', 'Derek Peine', '12/1/1995', 'Inactive', '', '', ''),
new Member('398', 'Earline Dikeman', '12/1/1995', 'Inactive', '', '', ''),
new Member('399', 'Elizabeth D. Hochberg', '12/1/1995', 'Inactive', '', '', ''),
new Member('400', 'Joel P. White', '12/1/1995', 'Inactive', '', '', ''),
new Member('401', 'John Herber', '12/1/1995', 'Inactive', '', '', ''),
new Member('402', 'Kevin Langenwalter', '12/1/1995', 'Inactive', '', '', ''),
new Member('403', 'Kristy Rizek', '12/1/1995', 'Inactive', '', '', ''),
new Member('404', 'Lara Domzalski', '12/1/1995', 'Inactive', '', '', ''),
new Member('405', 'Maryanne Collinson', '12/1/1995', 'Inactive', '', '', ''),
new Member('406', 'Michelle Menke', '12/1/1995', 'Inactive', '', '', ''),
new Member('407', 'Pedro Muino', '12/1/1995', 'Inactive', '', '', ''),
new Member('408', 'Peter Schebler', '12/1/1995', 'Inactive', '', '', ''),
new Member('409', 'Rachel (Niles) Dougherty', '12/1/1995', 'Inactive', '', '', ''),
new Member('410', 'Randall Fields', '12/1/1995', 'Inactive', '', '', ''),
new Member('411', 'Robert Brandt', '12/1/1995', 'Inactive', '', '', ''),
new Member('412', 'Annette Lewis', '4/26/1996', 'Inactive', '', '', ''),
new Member('413', 'Chris Sheeran', '4/26/1996', 'Inactive', '', '', ''),
new Member('414', 'Jason Hartman', '4/26/1996', 'Inactive', '', '', ''),
new Member('415', 'Rounak Mikha', '4/26/1996', 'Inactive', '', '', ''),
new Member('416', 'Shawn Torrez', '4/26/1996', 'Inactive', '', '', ''),
new Member('417', 'Tami Wachsnicht', '4/26/1996', 'Inactive', '', '', ''),
new Member('418', 'Ahmad Audi', '11/15/1996', 'Inactive', '', '', ''),
new Member('419', 'Corrie Carnes', '11/15/1996', 'Inactive', '', '', ''),
new Member('420', 'Darren Von Goedeke', '11/15/1996', 'Inactive', '', '', ''),
new Member('421', 'Diane (Stubbs) Diehl', '11/15/1996', 'Inactive', '', '', ''),
new Member('422', 'Erika Johnson', '11/15/1996', 'Inactive', '', '', ''),
new Member('423', 'Katie Surowski', '11/15/1996', 'Inactive', '', '', ''),
new Member('424', 'Kenneth Drake', '11/15/1996', 'Inactive', '', '', ''),
new Member('425', 'Matthew Kreps', '11/15/1996', 'Inactive', '', '', ''),
new Member('426', 'Megan White', '11/15/1996', 'Inactive', '', '', ''),
new Member('427', 'Minh Tran', '11/15/1996', 'Inactive', '', '', ''),
new Member('428', 'Natalie Gosch', '11/15/1996', 'Inactive', '', '', ''),
new Member('429', 'Phillip Tasset', '11/15/1996', 'Inactive', '', '', ''),
new Member('430', 'Scott D. Schroeder', '11/15/1996', 'Inactive', '', '', ''),
new Member('431', 'Amanda Simpson', '4/25/1997', 'Inactive', '', '', ''),
new Member('432', 'Andrew Beard', '4/25/1997', 'Inactive', '', '', ''),
new Member('433', 'Bonnie Nixon', '4/25/1997', 'Inactive', '', '', ''),
new Member('434', 'Brandon Oberling', '4/25/1997', 'Inactive', '', '', ''),
new Member('435', 'David Woemmel', '4/25/1997', 'Inactive', '', '', ''),
new Member('436', 'Dennis Hellon', '4/25/1997', 'Inactive', '', '', ''),
new Member('437', 'Destin Leinen', '4/25/1997', 'Inactive', '', '', ''),
new Member('438', 'Doug Lupher', '4/25/1997', 'Inactive', '', '', ''),
new Member('439', 'Keith Buszek', '4/25/1997', 'Inactive', '', '', ''),
new Member('440', 'Margo Hood', '4/25/1997', 'Inactive', '', '', ''),
new Member('441', 'Matt Olson', '4/25/1997', 'Inactive', '', '', ''),
new Member('442', 'Nathan Stockman', '4/25/1997', 'Inactive', '', '', ''),
new Member('443', 'Ruth (Alexander) Platt', '4/25/1997', 'Inactive', '', '', ''),
new Member('444', 'Scott D. Greenway', '4/25/1997', 'Inactive', '', '', ''),
new Member('445', 'Tony Bieker', '4/25/1997', 'Inactive', '', '', ''),
new Member('446', 'Zarry Tavakkol', '4/25/1997', 'Inactive', '', '', ''),
new Member('447', 'Brian Helfrich', '11/21/1997', 'Inactive', '', '', ''),
new Member('448', 'Dana (Fitzemeier) Krueger', '11/21/1997', 'Inactive', '', '', ''),
new Member('449', 'Daniel Felker', '11/21/1997', 'Inactive', '', '', ''),
new Member('450', 'Jacqueline Pettersch', '11/21/1997', 'Inactive', '', '', ''),
new Member('451', 'James McGill', '11/21/1997', 'Inactive', '', '', ''),
new Member('452', 'Kelly-Ann Buszek', '11/21/1997', 'Inactive', '', '', ''),
new Member('453', 'Kristin Kay Ecord', '11/21/1997', 'Inactive', '', '', ''),
new Member('454', 'Laurie Peterson', '11/21/1997', 'Inactive', '', '', ''),
new Member('455', 'Mark Cross', '11/21/1997', 'Inactive', '', '', ''),
new Member('456', 'Micah Alexander', '11/21/1997', 'Inactive', '', '', ''),
new Member('457', 'Wade Takeguchi', '11/21/1997', 'Inactive', '', '', ''),
new Member('458', 'James Wassenberg', '4/14/1998', 'Inactive', '', '', ''),
new Member('459', 'Nathan Chaffin', '4/14/1998', 'Inactive', '', '', ''),
new Member('460', 'Brandon Moore', '4/17/1998', 'Inactive', '', '', ''),
new Member('461', 'Chet Davidson', '4/17/1998', 'Inactive', '', '', ''),
new Member('462', 'Dan Higgins', '4/17/1998', 'Inactive', '', '', ''),
new Member('463', 'Eric Wika', '4/17/1998', 'Inactive', '', '', ''),
new Member('464', 'James Hodgson', '4/17/1998', 'Inactive', '', '', ''),
new Member('465', 'Kale Needham', '4/17/1998', 'Inactive', '', '', ''),
new Member('466', 'Kara Dunn', '4/17/1998', 'Inactive', '', '', ''),
new Member('467', 'Kent Meinhardt', '4/17/1998', 'Inactive', '', '', ''),
new Member('468', 'Matthew Lofgreen', '4/17/1998', 'Inactive', '', '', ''),
new Member('469', 'Adnan Abu-Yousif', '11/20/1998', 'Inactive', '', '', ''),
new Member('470', 'Andrew Ohmes', '11/20/1998', 'Inactive', '', '', ''),
new Member('471', 'Ben Peters', '11/20/1998', 'Inactive', '', '', ''),
new Member('472', 'Brian Jindra', '11/20/1998', 'Inactive', '', '', ''),
new Member('473', 'Cammy Lees', '11/20/1998', 'Inactive', '', '', ''),
new Member('474', 'Jason Goodin', '11/20/1998', 'Inactive', '', '', ''),
new Member('475', 'Molly Magill', '11/20/1998', 'Inactive', '', '', ''),
new Member('476', 'Paul Baures', '11/20/1998', 'Inactive', '', '', ''),
new Member('477', 'Peter J. Pauzauskie', '11/20/1998', 'Inactive', '', '', ''),
new Member('478', 'Richard Harris', '11/20/1998', 'Inactive', '', '', ''),
new Member('479', 'William Hodges', '11/20/1998', 'Inactive', '', '', ''),
new Member('480', 'Abhishekh Govind', '4/30/1999', 'Inactive', '', '', ''),
new Member('481', 'James Bennett', '4/30/1999', 'Inactive', '', '', ''),
new Member('482', 'Ryan Livengood', '4/30/1999', 'Inactive', '', '', ''),
new Member('483', 'Tyler Grindal', '4/30/1999', 'Inactive', '', '', ''),
new Member('484', 'William Stone', '4/30/1999', 'Inactive', '', '', ''),
new Member('485', 'Abra Birchall', '11/12/1999', 'Inactive', '', '', ''),
new Member('486', 'Amanda Eberth', '11/12/1999', 'Inactive', '', '', ''),
new Member('487', 'Dane Kohrs', '11/12/1999', 'Inactive', '', '', ''),
new Member('488', 'David Heroux', '11/12/1999', 'Inactive', '', '', ''),
new Member('489', 'Vladimir Yevseyenkov', '11/12/1999', 'Inactive', '', '', ''),
new Member('490', 'Patti Lewis', '11/14/1999', 'Inactive', '', '', ''),
new Member('491', 'Tamara Munsch', '11/15/1999', 'Inactive', '', '', ''),
new Member('492', 'Benjamin Champion', '4/7/2000', 'Inactive', '', '', ''),
new Member('493', 'Brian Novak', '4/7/2000', 'Inactive', '', '', ''),
new Member('494', 'David Hart', '4/7/2000', 'Inactive', '', '', ''),
new Member('495', 'David Razafsky', '4/7/2000', 'Inactive', '', '', ''),
new Member('496', 'Jeff Pierson', '4/7/2000', 'Inactive', '', '', ''),
new Member('497', 'Nisa Lafferty', '4/7/2000', 'Inactive', '', '', ''),
new Member('498', 'Steven Powell', '4/7/2000', 'Inactive', '', '', ''),
new Member('499', 'Erik Warnken', '11/4/2000', 'Inactive', '', '', ''),
new Member('500', 'Heidi Mueldener', '11/4/2000', 'Inactive', '', '', ''),
new Member('501', 'Kultida Varaphan', '11/4/2000', 'Inactive', '', '', ''),
new Member('502', 'Megan Drovetta', '11/4/2000', 'Inactive', '', '', ''),
new Member('503', 'Nolan Malthesen', '11/4/2000', 'Inactive', '', '', ''),
new Member('504', 'Sharon Kimball', '11/4/2000', 'Inactive', '', '', ''),
new Member('505', 'Alison Dopps', '3/30/2001', 'Inactive', '', '', ''),
new Member('506', 'Crystal Fullerton', '3/30/2001', 'Inactive', '', '', ''),
new Member('507', 'Elizabeth Rayburn', '3/30/2001', 'Inactive', '', '', ''),
new Member('508', 'Fonda Koehn', '3/30/2001', 'Inactive', '', '', ''),
new Member('509', 'John Erkmann', '3/30/2001', 'Inactive', '', '', ''),
new Member('510', 'John Worden', '3/30/2001', 'Inactive', '', '', ''),
new Member('511', 'Kevin Bass', '3/30/2001', 'Inactive', '', '', ''),
new Member('512', 'Matt Harmon', '3/30/2001', 'Inactive', '', '', ''),
new Member('513', 'Megan Johnson', '3/30/2001', 'Inactive', '', '', ''),
new Member('514', 'Rebecca Knott', '3/30/2001', 'Inactive', '', '', ''),
new Member('515', 'Shane Tracy', '3/30/2001', 'Inactive', '', '', ''),
new Member('516', 'Thomas Bays', '3/30/2001', 'Inactive', '', '', ''),
new Member('517', 'Tracie Munsch', '3/30/2001', 'Inactive', '', '', ''),
new Member('518', 'Tyler McGown', '3/30/2001', 'Inactive', '', '', ''),
new Member('519', 'Alexander Smetana', '11/9/2001', 'Inactive', '', '', ''),
new Member('520', 'Cameron (Fahrenholtz) Jeter', '11/9/2001', 'Inactive', '', '', ''),
new Member('521', 'John Latham', '11/9/2001', 'Inactive', '', '', ''),
new Member('522', 'Molly Bing', '11/9/2001', 'Inactive', '', '', ''),
new Member('523', 'Robyn Moore', '11/9/2001', 'Inactive', '', '', ''),
new Member('524', 'Adam Brooks', '4/13/2002', 'Inactive', '', '', ''),
new Member('525', 'Amanda Sells', '4/13/2002', 'Inactive', '', '', ''),
new Member('526', 'Courtney Boysen', '4/13/2002', 'Inactive', '', '', ''),
new Member('527', 'Gustavo Seabra', '4/13/2002', 'Inactive', '', '', ''),
new Member('528', 'Hannah Adamson', '4/13/2002', 'Inactive', '', '', ''),
new Member('529', 'Janie Salmon', '4/13/2002', 'Inactive', '', '', ''),
new Member('530', 'Jessica Facer', '4/13/2002', 'Inactive', '', '', ''),
new Member('531', 'Jill (Sowers) Neitzel', '4/13/2002', 'Inactive', '', '', ''),
new Member('532', 'Kate Dooley', '4/13/2002', 'Inactive', '', '', ''),
new Member('533', 'Lauren (Taylor) Watts', '4/13/2002', 'Inactive', '', '', ''),
new Member('534', 'Leigh Fine', '4/13/2002', 'Inactive', '', '', ''),
new Member('535', 'Amy LaGesse', '11/22/2002', 'Inactive', '', '', ''),
new Member('536', 'Bryan Watts', '11/22/2002', 'Inactive', '', '', ''),
new Member('537', 'Jordan Fowler', '11/22/2002', 'Inactive', '', '', ''),
new Member('538', 'Katherine McKenzie', '11/22/2002', 'Inactive', '', '', ''),
new Member('539', 'Leila McKenzie', '11/22/2002', 'Inactive', '', '', ''),
new Member('540', 'Slava Zakjevskii Jr.', '11/22/2002', 'Inactive', '', '', ''),
new Member('541', 'Tanner Callender', '11/22/2002', 'Inactive', '', '', ''),
new Member('542', 'Alexandria Dunn', '4/11/2003', 'Inactive', '', '', ''),
new Member('543', 'Amanda Meyer', '4/11/2003', 'Inactive', '', '', ''),
new Member('544', 'Amy Johnston', '4/11/2003', 'Inactive', '', '', ''),
new Member('545', 'Christopher Bradwell', '4/11/2003', 'Inactive', '', '', ''),
new Member('546', 'Eric Banner', '4/11/2003', 'Inactive', '', '', ''),
new Member('547', 'Gina Mercurio', '4/11/2003', 'Inactive', '', '', ''),
new Member('548', 'Kristin Ohnmacht', '4/11/2003', 'Inactive', '', '', ''),
new Member('549', 'Meghan Hampton', '4/11/2003', 'Inactive', '', '', ''),
new Member('550', 'Sara Hoffman', '4/11/2003', 'Inactive', '', '', ''),
new Member('551', 'Shawnalea Frazier', '4/11/2003', 'Inactive', '', '', ''),
new Member('552', 'William Sanders', '4/11/2003', 'Inactive', '', '', ''),
new Member('553', 'Andrea Wosel', '11/21/2003', 'Inactive', '', '', ''),
new Member('554', 'Anne Kancel', '11/21/2003', 'Inactive', '', '', ''),
new Member('555', 'Cecilia Ariga Kerubo', '11/21/2003', 'Inactive', '', '', ''),
new Member('556', 'Christopher Rice', '11/21/2003', 'Inactive', '', '', ''),
new Member('557', 'Holly Mayer', '11/21/2003', 'Inactive', '', '', ''),
new Member('558', 'Johni (Lee) Curts', '11/21/2003', 'Inactive', '', '', ''),
new Member('559', 'Justin Raybern', '11/21/2003', 'Inactive', '', '', ''),
new Member('560', 'Marsha McDade', '11/21/2003', 'Inactive', '', '', ''),
new Member('561', 'Nathan Moore', '11/21/2003', 'Inactive', '', '', ''),
new Member('562', 'Ryan Peck', '11/21/2003', 'Inactive', '', '', ''),
new Member('563', 'Shannon Stadler', '11/21/2003', 'Inactive', '', '', ''),
new Member('564', 'Shelby Lies', '11/21/2003', 'Inactive', '', '', ''),
new Member('565', 'Andrew Jurgensmeier', '4/30/2004', 'Inactive', '', '', ''),
new Member('566', 'Daniel Sanford', '4/30/2004', 'Inactive', '', '', ''),
new Member('567', 'David Liang', '4/30/2004', 'Inactive', '', '', ''),
new Member('568', 'Erin Hemphill', '4/30/2004', 'Inactive', '', '', ''),
new Member('569', 'Evin (Worthington) Alcindor', '4/30/2004', 'Inactive', '', '', ''),
new Member('570', 'James Latta', '4/30/2004', 'Inactive', '', '', ''),
new Member('571', 'Joshua Pritts', '4/30/2004', 'Inactive', '', '', ''),
new Member('572', 'Justin Cunningham', '4/30/2004', 'Inactive', '', '', ''),
new Member('573', 'Katherine Shaeffer', '4/30/2004', 'Inactive', '', '', ''),
new Member('574', 'Kyle Swanson', '4/30/2004', 'Inactive', '', '', ''),
new Member('575', 'Lucinda Sullivan', '4/30/2004', 'Inactive', '', '', ''),
new Member('576', 'Meg Fasulo', '4/30/2004', 'Inactive', '', '', ''),
new Member('577', 'Samuel King', '4/30/2004', 'Inactive', '', '', ''),
new Member('578', 'Sandy Stich', '4/30/2004', 'Inactive', '', '', ''),
new Member('579', 'Willie Barrow', '4/30/2004', 'Inactive', '', '', ''),
new Member('580', 'Alyssa Newth', '11/19/2004', 'Inactive', '', '', ''),
new Member('581', 'Alyssa Warneke', '11/19/2004', 'Inactive', '', '', ''),
new Member('582', 'Ben Winter', '11/19/2004', 'Inactive', '', '', ''),
new Member('583', 'Brette Cochenour', '11/19/2004', 'Inactive', '', '', ''),
new Member('584', 'Charles Krumins', '11/19/2004', 'Inactive', '', '', ''),
new Member('585', 'Hillary Pounds', '11/19/2004', 'Inactive', '', '', ''),
new Member('586', 'Katrina Pekar-Carpenter', '11/19/2004', 'Inactive', '', '', ''),
new Member('587', 'Kimberly Lovell', '11/19/2004', 'Inactive', '', '', ''),
new Member('588', 'Kyle Smith', '11/19/2004', 'Inactive', '', '', ''),
new Member('589', 'Lindsay Hall', '11/19/2004', 'Inactive', '', '', ''),
new Member('590', 'Lydia Barrigan', '11/19/2004', 'Inactive', '', '', ''),
new Member('591', 'Megan Hillebrand', '11/19/2004', 'Inactive', '', '', ''),
new Member('592', 'Nadja Joergensen', '11/19/2004', 'Inactive', '', '', ''),
new Member('593', 'Nelson Green', '11/19/2004', 'Inactive', '', '', ''),
new Member('594', 'Prachi Gupta', '11/19/2004', 'Inactive', '', '', ''),
new Member('595', 'Sara Rans', '11/19/2004', 'Inactive', '', '', ''),
new Member('596', 'Teresa Wilson', '11/19/2004', 'Inactive', '', '', ''),
new Member('597', 'Zachary Jepson', '11/19/2004', 'Inactive', '', '', ''),
new Member('598', 'Neal Friesen', '12/4/2004', 'Inactive', '', '', ''),
new Member('599', 'Timothy Dunn', '12/4/2004', 'Inactive', '', '', '&Alpha;&Theta;'),
new Member('600', 'Adam Kretzer', '4/29/2005', 'Inactive', '', '', ''),
new Member('601', 'Amy Twite', '4/29/2005', 'Inactive', '', '', ''),
new Member('602', 'Daniel Madgwick', '4/29/2005', 'Inactive', '', '', ''),
new Member('603', 'Jerod Junghans', '4/29/2005', 'Inactive', '', '', ''),
new Member('604', 'Kelly Reinecke', '4/29/2005', 'Inactive', '', '', ''),
new Member('605', 'Lance Williamson', '4/29/2005', 'Inactive', '', '', ''),
new Member('606', 'Laura Grauer', '4/29/2005', 'Inactive', '', '', ''),
new Member('607', 'Mark Banker', '4/29/2005', 'Inactive', '', '', ''),
new Member('608', 'Melissa Veldman', '4/29/2005', 'Inactive', '', '', ''),
new Member('609', 'Tony Kuckelman', '4/29/2005', 'Inactive', '', '', ''),
new Member('610', 'Trapper Callender', '4/29/2005', 'Inactive', '', '', ''),
new Member('611', 'Allison Hadley', '12/2/2005', 'Inactive', '', '', ''),
new Member('612', 'Brianna Barnes', '12/2/2005', 'Inactive', '', '', ''),
new Member('613', 'Christopher Culbertson', '12/2/2005', 'Inactive', '', '', ''),
new Member('614', 'Christopher Levy', '12/2/2005', 'Inactive', '', '', ''),
new Member('615', 'Elizabeth Blaesi', '12/2/2005', 'Inactive', '', '', ''),
new Member('616', 'Joseph Atkins', '12/2/2005', 'Inactive', '', '', ''),
new Member('617', 'Joseph V. Ortiz', '12/2/2005', 'Inactive', '', '', ''),
new Member('618', 'Katie Simmons', '12/2/2005', 'Inactive', '', '', ''),
new Member('619', 'Laura Platt', '12/2/2005', 'Inactive', '', '', ''),
new Member('620', 'Sarah Shultz', '12/2/2005', 'Inactive', '', '', ''),
new Member('621', 'Stefan Kraft', '12/2/2005', 'Inactive', '', '', ''),
new Member('622', 'Sundeep Rayat', '12/2/2005', 'Inactive', '', '', ''),
new Member('623', 'Takashi Ito', '12/2/2005', 'Inactive', '', '', ''),
new Member('624', 'Taryn Meyer', '12/2/2005', 'Inactive', '', '', ''),
new Member('625', 'Alicia Linhardt', '3/31/2006', 'Inactive', '', '', ''),
new Member('626', 'Andrew Kerns', '3/31/2006', 'Inactive', '', '', ''),
new Member('627', 'Jeanne Pierzynski', '3/31/2006', 'Inactive', '', '', ''),
new Member('628', 'Mark Battig', '3/31/2006', 'Inactive', '', '', ''),
new Member('629', 'Meredith (Smythe) Linhardt', '3/31/2006', 'Inactive', '', '', ''),
new Member('630', 'Tara Kalivoda', '3/31/2006', 'Inactive', '', '', ''),
new Member('631', 'Tess Blankenship', '3/31/2006', 'Inactive', '', '', ''),
new Member('632', 'Theresa Marchioni', '3/31/2006', 'Inactive', '', '', ''),
new Member('633', 'Caitlin Palko', '11/17/2006', 'Inactive', '', '', ''),
new Member('634', 'Jennifer Stegman', '11/17/2006', 'Inactive', '', '', ''),
new Member('635', 'Kathryn Brewer', '11/17/2006', 'Inactive', '', '', ''),
new Member('636', 'Melissa Waller', '11/17/2006', 'Inactive', '', '', ''),
new Member('637', 'Robert Christian', '11/17/2006', 'Inactive', '', '', ''),
new Member('638', 'Sara Powell', '11/17/2006', 'Inactive', '', '', ''),
new Member('639', 'Stefan Bossmann', '11/17/2006', 'Inactive', '', '', ''),
new Member('640', 'Andrew Brown', '4/20/2007', 'Inactive', '', '', ''),
new Member('641', 'Ariel Burns', '4/20/2007', 'Inactive', '', '', ''),
new Member('642', 'Christopher Jones', '4/20/2007', 'Inactive', '', '', ''),
new Member('643', 'Lucas Carpenter', '4/20/2007', 'Inactive', '', '', ''),
new Member('644', 'Pinakin Sukthankar', '4/20/2007', 'Inactive', '', '', ''),
new Member('645', 'Tyler Koehn', '4/20/2007', 'Inactive', '', '', ''),
new Member('646', 'Brendan Lund', '11/16/2007', 'Inactive', '', '', ''),
new Member('647', 'Brenton Shanks', '11/16/2007', 'Inactive', '', '', ''),
new Member('648', 'Christopher Tuinenga', '11/16/2007', 'Inactive', '', '', ''),
new Member('649', 'Glenda Hutchison', '11/16/2007', 'Inactive', '', '', ''),
new Member('650', 'Hallie Botter', '11/16/2007', 'Inactive', '', '', ''),
new Member('651', 'Hannah Johnson', '11/16/2007', 'Inactive', '', '', ''),
new Member('652', 'Jackie Johnson', '11/16/2007', 'Inactive', '', '', ''),
new Member('653', 'Jared Wilmoth', '11/16/2007', 'Inactive', '', '', ''),
new Member('654', 'Jithma Abeykoon', '11/16/2007', 'Inactive', '', '', ''),
new Member('655', 'Kelsey Pearson', '11/16/2007', 'Inactive', '', '', ''),
new Member('656', 'Ryan Hill', '11/16/2007', 'Inactive', '', '', ''),
new Member('657', 'Stephanie Alderman-Oler', '11/16/2007', 'Inactive', '', '', ''),
new Member('658', 'Cara Katzer', '4/11/2008', 'Inactive', '', '', ''),
new Member('659', 'Hayes Charles', '4/11/2008', 'Inactive', '', '', ''),
new Member('660', 'Anna Rogers', '11/21/2008', 'Inactive', '', '', ''),
new Member('661', 'Ashley Bili', '11/21/2008', 'Inactive', '', '', ''),
new Member('662', 'Barbara Braga', '11/21/2008', 'Inactive', '', '', ''),
new Member('663', 'Colette Robinson', '11/21/2008', 'Inactive', '', '', ''),
new Member('664', 'Kraig Sells', '11/21/2008', 'Inactive', '', '', ''),
new Member('665', 'Laura Grayson', '11/21/2008', 'Inactive', '', '', ''),
new Member('666', 'Maria Pinilla', '11/21/2008', 'Inactive', '', '', ''),
new Member('667', 'Natasha Mai-Bowmaker', '11/21/2008', 'Inactive', '', '', ''),
new Member('668', 'Nathan Peterman', '11/21/2008', 'Inactive', '', '', ''),
new Member('669', 'P. Lankika Goff', '11/21/2008', 'Inactive', '', '', ''),
new Member('670', 'Sophia Thompson', '11/21/2008', 'Inactive', '', '', ''),
new Member('671', 'Theresia McCollum', '11/21/2008', 'Inactive', '', '', ''),
new Member('672', 'Emery Brown', '4/1/2009', 'Active', '', '', '&Gamma;&Theta;'),
new Member('673', 'Christian Montes', '5/1/2009', 'Active', '', '', ''),
new Member('674', 'Karsten Evans', '5/1/2009', 'Inactive', '', '', ''),
new Member('675', 'Kendrea Bensel', '5/1/2009', 'Inactive', '', '', ''),
new Member('676', 'Leonie Bossmann', '5/1/2009', 'Inactive', '', '', ''),
new Member('677', 'Danielle Conover', '11/20/2009', 'Inactive', '', '', ''),
new Member('678', 'Jon Adams', '11/20/2009', 'Inactive', '', '', ''),
new Member('679', 'Josh Neufeld', '11/20/2009', 'Inactive', '', '', ''),
new Member('680', 'Katelyn Kuecker', '11/20/2009', 'Inactive', '', '', ''),
new Member('681', 'Leila Maurmann', '11/20/2009', 'Inactive', '', '', ''),
new Member('682', 'Meghan Kelly', '11/20/2009', 'Inactive', '', '', ''),
new Member('683', 'Victor Chikan', '11/20/2009', 'Inactive', '', '', ''),
new Member('684', 'Adam Schondelmaier', '4/16/2010', 'Inactive', '', '', ''),
new Member('685', 'Akeem Giles', '4/16/2010', 'Inactive', '', '', ''),
new Member('686', 'Allison Meyer', '4/16/2010', 'Inactive', '', '', ''),
new Member('687', 'Angela Grommet', '4/16/2010', 'Inactive', '', '', ''),
new Member('688', 'Cameron Finch', '4/16/2010', 'Inactive', '', '', ''),
new Member('689', 'Chloe Callahan', '4/16/2010', 'Inactive', '', '', ''),
new Member('690', 'Glenn Hafenstine', '4/16/2010', 'Inactive', '', '', ''),
new Member('691', 'Jessica Long', '4/16/2010', 'Inactive', '', '', ''),
new Member('692', 'Megan Peterson', '4/16/2010', 'Inactive', '', '', ''),
new Member('693', 'Parker Rayl', '4/16/2010', 'Inactive', '', '', ''),
new Member('694', 'Stephen Zuiss', '4/16/2010', 'Inactive', '', '', ''),
new Member('695', 'Aaron Schmidt', '12/3/2010', 'Inactive', '', '', ''),
new Member('696', 'Anthony Ralston', '12/3/2010', 'Inactive', '', '', ''),
new Member('697', 'Caitlin Moses', '12/3/2010', 'Inactive', '', '', ''),
new Member('698', 'Chancellor Deviney', '12/3/2010', 'Active', 'Lead', '', ''),
new Member('699', 'Daniel Tye', '12/3/2010', 'Inactive', '', '', ''),
new Member('700', 'Elizabeth Lowry', '12/3/2010', 'Inactive', '', '', ''),
new Member('701', 'Eric Geanes', '12/3/2010', 'Active', 'Mercury', '', ''),
new Member('702', 'Rebecca Taylor', '12/3/2010', 'Active', 'Lead', '', ''),
new Member('703', 'Samantha Talley', '12/3/2010', 'Active', '', '', ''),
new Member('704', 'Sterling Braun', '12/3/2010', 'Inactive', '', '', ''),
new Member('705', 'XiangYi Xia', '12/3/2010', 'Inactive', '', '', ''),
new Member('706', 'Andrew Kipp', '4/30/2011', 'Inactive', '', '', ''),
new Member('707', 'Brianne Pierce', '4/30/2011', 'Active', 'Gold', '', ''),
new Member('708', 'Chris Harrington', '4/30/2011', 'Inactive', '', '', ''),
new Member('709', 'Dakota Bixler', '4/30/2011', 'Inactive', '', '', ''),
new Member('710', 'Emma Brace', '4/30/2011', 'Active', 'Copper', '', ''),
new Member('711', 'Grant Borthwick', '4/30/2011', 'Active', 'Iron', '', ''),
new Member('712', 'Jessica Martin', '4/30/2011', 'Active', '', '', ''),
new Member('713', 'Katherine Gentry', '4/30/2011', 'Active', 'Gold', '', ''),
new Member('714', 'Pamela Maynez', '4/30/2011', 'Inactive', '', '', ''),
new Member('715', 'Allison Johnson', '12/3/2011', 'Active', '', '', ''),
new Member('716', 'Denise Cobb', '12/3/2011', 'Active', 'Lead', '', ''),
new Member('717', 'John Nail', '12/3/2011', 'Active', '', '', ''),
new Member('718', 'Krystal Duer', '12/3/2011', 'Active', 'Silver', '', ''),
new Member('719', 'Marlena Birkel', '12/3/2011', 'Inactive', '', '', ''),
new Member('720', 'Megan Crawshaw', '12/3/2011', 'Active', '', '', ''),
new Member('721', 'Megan Kelley', '12/3/2011', 'Active', '', '', ''),
new Member('722', 'Alexis Tucker', '4/28/2012', 'Inactive', '', '', ''),
new Member('723', 'Christine Spartz', '4/28/2012', 'Active', 'Copper', '', ''),
new Member('724', 'Kasen Lee', '4/28/2012', 'Active', '', '', ''),
new Member('725', 'Matthew Ford', '4/28/2012', 'Inactive', '', '', ''),
new Member('726', 'Taylor Fetrow', '4/28/2012', 'Active', 'Tin', '', ''),
new Member('727', 'Taylor Stackley', '4/28/2012', 'Inactive', '', '', ''),
new Member('728', 'Zachary Mason', '4/28/2012', 'Inactive', '', '', ''),
new Member('729', 'Andrew Warner', '11/10/2012', 'Active', 'Iron', '711', ''),
new Member('730', 'Chris Cox', '11/10/2012', 'Active', 'Tin', '726', ''),
new Member('731', 'John Rosa', '11/10/2012', 'Active', 'Lead', '716', ''),
new Member('732', 'Kali Hinman', '11/10/2012', 'Active', 'Copper', '710', ''),
new Member('733', 'Matthew Reynolds', '11/10/2012', 'Active', 'Mercury', '701', ''),
new Member('734', 'Sara Joyce', '11/10/2012', 'Active', 'Silver', '718', ''),
new Member('735', 'Amanda Nelson', '4/27/2013', 'Active', 'Mercury', '733', ''),
new Member('736', 'Andrew Nigh', '4/27/2013', 'Active', 'Silver', '734', ''),
new Member('737', 'Bailey Ward', '4/27/2013', 'Active', 'Gold', '713', ''),
new Member('738', 'James Balthazor', '4/27/2013', 'Active', 'Lead', '716', ''),
new Member('739', 'Logan Harrold', '4/27/2013', 'Active', 'Copper', '710', ''),
new Member('740', 'Macy Garcia', '4/27/2013', 'Active', 'Mercury', '701', ''),
new Member('741', 'Sarah Schuetze', '4/27/2013', 'Active', 'Iron', '729', ''),
new Member('742', 'David Martin', '11/16/2013', 'Active', 'Mercury', '701', ''),
new Member('743', 'Fernando Nieto', '11/16/2013', 'Active', 'Lead', '698', ''),
new Member('744', 'George Podaru', '11/16/2013', 'Active', 'Tin', '726', ''),
new Member('745', 'Harrison Schmidt', '11/16/2013', 'Active', 'Gold', '713', ''),
new Member('746', 'Jacob Schroeder', '11/16/2013', 'Active', 'Copper', '710', ''),
new Member('747', 'Jenny Barriga', '11/16/2013', 'Active', 'Gold', '707', ''),
new Member('748', 'Katelyn Salmans', '11/16/2013', 'Active', 'Iron', '741', ''),
new Member('749', 'Kelsey Crow', '11/16/2013', 'Active', 'Gold', '737', ''),
new Member('750', 'Kelsie Cole', '11/16/2013', 'Active', 'Silver', '736', ''),
new Member('751', 'Kendall Konrade', '11/16/2013', 'Active', 'Silver', '718', ''),
new Member('752', 'Laura Mallonee', '11/16/2013', 'Active', 'Mercury', '735', ''),
new Member('753', 'Lauren Conrow', '11/16/2013', 'Active', 'Gold', '707', ''),
new Member('754', 'Peter Betzen', '11/16/2013', 'Active', 'Mercury', '701', ''),
new Member('755', 'Rachel Quinnett', '11/16/2013', 'Active', 'Tin', '730', ''),
new Member('756', 'Regan Konz', '11/16/2013', 'Active', 'Gold', '713', ''),
new Member('757', 'Riley Emley', '11/16/2013', 'Active', 'Copper', '710', ''),
new Member('758', 'Sarah Munday', '11/16/2013', 'Active', 'Lead', '702', ''),
new Member('759', 'Sean Smith', '11/16/2013', 'Active', 'Mercury', '733', ''),
new Member('760', 'Tristan Grieves', '11/16/2013', 'Active', 'Iron', '711', ''),
new Member('761', 'Vinh Hoang', '11/16/2013', 'Active', 'Iron', '729', ''));
/* End Initialize Members */
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
        for (var i = 0; i < viewModel.memberList.length; ++i){
            var member = viewModel.memberList[i];
            if (!viewModel.pledgeClassList[member.date]){
                var pledgeClass = new PledgeClass(member.date);
                viewModel.pledgeClassList[member.date] = pledgeClass;
                viewModel.pledgeClassList.push(pledgeClass);
            }
            viewModel.pledgeClassList[member.date].memberList.push(member);
        }
        // Families        
        for (var i = 0; i < families.length; ++i){
            var family = new Family(families[i]);
            viewModel.familyList.push(family);
            viewModel.familyList[family.name] = family;
            
            viewModel.familyAlbum.pictureList.push(new AlbumPicture(baseFamilySrc + families[i] + ".jpg"));
        }
        var index = {};
        for (var i = 0; i < viewModel.memberList.length; ++i){
            var member = viewModel.memberList[i];
            index[member.id] = member;
        }
        for (var i = 0; i < viewModel.memberList.length; ++i){
            var member = viewModel.memberList[i];
            if (member.family){
                if (member.big){
                    index[member.big].x.littles.push(member);
                } else {
                    viewModel.familyList[member.family].memberList.push(member);
                }
            }
        }
    })();
    (function initializeAlbums(){
        var num = function(count){
            var ret = [];
            for (var i = 1; i <= count; ++i){
                ret.push(i + ".jpg");
            }
            return ret;
        };
        var splitAlbums = function(albums){
            var ret = [];
            for (var i = 0; i < albums.length; ++i){
                ret.push(addAlbum("images/albums", albums[i].n, albums[i].a, albums[i].p));
            }
            return ret;
        };
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
        var albumList = [/* Initialize Albums */{n:'2016',a:[{n:'Bowling Fall 2016',p:unshift(['14317410_10208953208446359_5644881458121621194_n.jpg','14322507_10208953218486610_8467792022806382474_n.jpg','14355746_10208953208766367_7631534818919819788_n.jpg','14368822_10208953208406358_3718688573191430093_n.jpg','14370397_1144303042329436_2246313095086173674_n.jpg'])},{n:'Games 2016',p:unshift(['13118869_10207912493309131_8433279687904938908_n.jpg','13124750_10207912493029124_477872911758439414_n.jpg','13139165_10207912493109126_1332213298870332989_n.jpg','13151992_10207912493269130_5778067442865302146_n.jpg','13166004_10207912493709141_1988099957621491295_n.jpg','13177513_10207912494029149_7740890606724221718_n.jpg','13177794_10207912493629139_3445795309725040243_n.jpg'])},{n:'Initiation Fall 2016',p:unshift(['15194466_10209676682532759_2079685953717433348_o.jpg','15195832_10209676701213226_5478860424601419105_o.jpg','15195833_10209676671892493_4042189948815601329_o.jpg','15196035_10209676672092498_5235788218301513839_o.jpg','15235352_10209676690812966_2240647809717789227_o.jpg','15235475_10209676671612486_4953772521394407766_o.jpg','15235607_10209676670812466_1716409236746637433_o.jpg','15235795_10209676686852867_1859111567952227196_o.jpg','15250765_10209676678932669_8408488800317063469_o.jpg','15250859_10209676680612711_8472295887039697826_o.jpg','15250935_10209676680132699_3459292985950173030_o.jpg','15252520_10209676697053122_1880850131236868591_o.jpg','15252522_10209676689092923_5112859614173428207_o.jpg','15252687_10209676696933119_4196639918114729579_o.jpg','15259251_10209676675972595_5051742688862830359_o.jpg','15271985_10209676687332879_938253951118354170_o.jpg','15272068_10209676674692563_358403256320984253_o.jpg','15272238_10209676694973070_9100412098376682857_o.jpg','15272311_10209676692933019_6894423262433521732_o.jpg','15289141_10209676689812941_1733212286172575833_o.jpg','15289324_10209676701973245_8900019434971788732_o.jpg','15304102_10209676676172600_8642893866057577365_o.jpg','15304152_10209676701013221_1375584610506358920_o.jpg','15304301_10209676693173025_6056440671415753133_o.jpg','15304489_10209676694853067_2293367564243133735_o.jpg','15304542_10209676691532984_1672148534115309777_o.jpg'])},{n:'May 2016-September 2016(Spring2016 initiation)',p:unshift(['14524596_10209324980180420_8600890094351735715_o.jpg','14556582_10209324987820611_2821802891597645709_o.jpg','14566300_10209324974340274_3802321817389426417_o.jpg','14566308_10209324973380250_1545481955996721550_o.jpg','14566469_10209324979300398_6810383164346398581_o.jpg','14570558_10209324976140319_6478247796717157282_o.jpg','14590027_10209324986340574_1277708796761448066_o.jpg','14590063_10209324990660682_5789147366391341386_o.jpg','14608819_10209324991220696_6643178962070002848_o.jpg','14612433_10209324991820711_4798253062579690253_o.jpg','14692058_10209324983900513_5576592448521368296_o.jpg','14692059_10209324985180545_6404813895739044906_o.jpg','14706758_10209324969620156_922814863272778797_o.jpg','14706920_10209324984660532_7613422385318498194_o.jpg','14708057_10209324963339999_8368038977180313326_o.jpg','14711034_10209324963460002_6879253932430844749_o.jpg','14711617_10209324960859937_1382565659278426473_o.jpg','14711645_10209324978180370_6664973183231958700_o.jpg','14712481_10209324971820211_8051050566156681613_o.jpg','14712500_10209324966140069_8939142760016407213_o.jpg','14712570_10209324989380650_3997833037958873811_o.jpg','14712732_10209324966380075_6991037883338161857_o.jpg','14714795_10209324978740384_1012172721326919037_o.jpg','14714909_10209324982740484_1356647984142962920_o.jpg','14714917_10209324977740359_3897706938485402874_o.jpg','14715516_10209324960899938_2065968936188262558_o.jpg','14715576_10209324986140569_699567684691428331_o.jpg','14753807_10209324987940614_3380126132234450167_o.jpg','14852990_10209324990100668_2379057437886917878_o.jpg','14853132_10209324989060642_4688909320417302415_o.jpg','14853149_10209324968940139_72855477937094174_o.jpg','14853192_10209324981060442_6500677153006086798_o.jpg','14853227_10209324975340299_7876818305325518962_o.jpg'])},{n:'Open House BBQ contest',p:unshift(['12983773_10207221483914278_5623093060984533677_o.jpg','12990837_10207221482954254_8289999084214834740_n.jpg','13002475_10207221484074282_4882311975251754468_o.jpg','13012801_10207221482714248_2657602767043478415_n.jpg','13012866_10207221482314238_6760006090598709177_n.jpg','13015505_10207221483194260_2845004211892936889_n.jpg'])},{n:'Open House Spring 2016',p:unshift(['12983233_1042734239097466_5056416010314643157_o.jpg','13041096_1042734265764130_408865001931673967_o.jpg','13055775_1042734259097464_8607292752350283132_o.jpg'])},{n:'Outreach',p:unshift(['15235877_1215939531776935_7093700089098872760_o.jpg','15259251_1215939548443600_4595020675952338175_o.jpg','15259463_1215939528443602_1403674773528338801_o.jpg','15259697_1215939431776945_602937517252257101_o.jpg','15272309_1215939435110278_3829915840392924886_o.jpg','15304541_1215939425110279_27212347684677071_o.jpg'])},{n:'Social Event Spring 2016',p:unshift(['13118869_10207912493309131_8433279687904938908_n.jpg','13124750_10207912493029124_477872911758439414_n.jpg','13139165_10207912493109126_1332213298870332989_n.jpg','13151992_10207912493269130_5778067442865302146_n.jpg','13166004_10207912493709141_1988099957621491295_n.jpg','13177513_10207912494029149_7740890606724221718_n.jpg','13177794_10207912493629139_3445795309725040243_n.jpg'])}]},{n:'2015',a:[{n:'AXE 50th Celebration',p:unshift(['887466_10206668750696343_7753741677132290912_o.jpg','887504_10206668722375635_7358527510223142260_o.jpg','905563_10206668716055477_2888632084874183112_o.jpg','905563_10206668748936299_7554036138898374759_o.jpg','905743_10206668745816221_7800633805798336287_o.jpg','1888876_10206668730175830_3324978178923717364_o.jpg','10548710_10206668744656192_3583872194164880392_o.jpg','11012063_10206668723975675_6523279830225572727_o.jpg','11015796_10206668730215831_4403498329885732929_o.jpg','11052006_10206668731055852_217575328132899017_o.jpg','11054410_10206668736335984_3827689963927921348_o.jpg','11063854_10206668730975850_7101378723936788350_o.jpg','11110513_10206668797377510_6984941951768488625_o.jpg','11114043_10206668713495413_2139337852194138033_o.jpg','11223725_10206668733535914_6070764636398814597_o.jpg','11233565_10206668711935374_3603593793095289586_o.jpg','11235452_10206668718375535_2308796824541501731_o.jpg','11236475_10206668727255757_2115663989151602425_o.jpg','11950195_10206668752096378_8159314133958658709_o.jpg','12087922_10206668711135354_9032419438776481142_o.jpg','12182397_10206668755296458_7693084419718092292_o.jpg','12182428_10206668726215731_2465264717576653033_o.jpg','12182442_10206668750576340_2933003152302136181_o.jpg','12182466_10206668727335759_8852719976319859036_o.jpg','12182740_10206668741816121_5472126913515931217_o.jpg','12182917_10206668727375760_7248584979801380444_o.jpg','12182933_10206668721855622_4644390005026371862_o.jpg','12182980_10206668741896123_8747230545292883570_o.jpg','12182981_10206668712655392_3211958825513932017_o.jpg','12182981_10206668720775595_7262795017346349129_o.jpg','12182993_10206668744336184_6574184000744090601_o.jpg','12183720_10206668740136079_4707006826421686920_o.jpg','12183796_10206668724855697_5973764362323816271_o.jpg','12183797_10206668712575390_2255865689684993035_o.jpg','12183840_10206668744456187_8371242502198244078_o.jpg','12183894_10206668734655942_4097495352264162346_o.jpg','12183912_10206668724895698_6944329448833693691_o.jpg','12183932_10206668733495913_5713029996871076993_o.jpg','12183999_10206668743256157_1512884106973596936_o.jpg','12184037_10206668750776345_1715605357839630796_o.jpg','12184037_10206668753336409_2106632752931632280_o.jpg','12184073_10206668709255307_171548414479373193_o.jpg','12184119_10206668710535339_1206192785747301661_o.jpg','12184300_10206668713535414_3746333382681766583_o.jpg','12185051_10206668734615941_5488613774778898301_o.jpg','12185077_10206668733455912_6861420964955154665_o.jpg','12185093_10206668708375285_1327845863363030583_o.jpg','12185119_10206668719335559_7303364631258628478_o.jpg','12185129_10206668734495938_5421710939519620839_o.jpg','12185142_10206668728375785_3524783431066751693_o.jpg','12185154_10206668712615391_1523706018038544586_o.jpg','12185157_10206668732255882_6931196742337051635_o.jpg','12185260_10206668745976225_6724873990763791850_o.jpg','12185397_10206668739096053_5884795421946975712_o.jpg','12185415_10206668714695443_5010474419377672528_o.jpg','12185557_10206668737256007_7577639447430244042_o.jpg','12186253_10206668740216081_6919421862719803422_o.jpg','12186260_10206668736295983_8840631027057657314_o.jpg','12186321_10206668748976300_2137761845257936745_o.jpg','12186351_10206668710455337_5415588682793108283_o.jpg','12186356_10206668724935699_5357718701065418488_o.jpg','12186359_10206668720815596_352834353865489675_o.jpg','12186461_10206668719455562_4973920782662959904_o.jpg','12186486_10206668711895373_1636104193778817524_o.jpg','12186510_10206668740176080_6943628385628797022_o.jpg','12186651_10206668718455537_2776669402530983839_o.jpg','12186672_10206668720455587_6732677942156255370_o.jpg','12186676_10206668726095728_5801451165532505712_o.jpg','12186766_10206668711055352_5536949871352649688_o.jpg','12186852_10206668708415286_8569623481962507115_o.jpg','12187955_10206668711015351_2531879663608501269_o.jpg','12188001_10206668709375310_4492965090003881581_o.jpg','12188002_10206668721895623_6954903218937245593_o.jpg','12188009_10206668717175505_3176541039511369319_o.jpg','12188150_10206668741856122_802452329321962723_o.jpg','12189257_10206668731615866_1672160060067675896_o.jpg','12189260_10206668729015801_6200330833523382988_o.jpg','12189264_10206668714615441_4346569110284394253_o.jpg','12189286_10206668713415411_1829181853678375794_o.jpg','12189287_10206668746056227_7920036774270976827_o.jpg','12189377_10206668708455287_4070550556610982781_o.jpg','12189390_10206668722735644_1718287973488912146_o.jpg','12189393_10206668716015476_7567649075414739512_o.jpg','12191150_10206668732535889_4342246443095346435_o.jpg','12191152_10206668717255507_6373136512100849109_o.jpg','12191179_10206668718975550_4367455639716657957_o.jpg','12191191_10206668747336259_8353554658417910705_o.jpg','12191200_10206668717215506_7609010601770118850_o.jpg','12191200_10206668743376160_4387633617154645428_o.jpg','12191203_10206668730255832_214331565911208126_o.jpg','12191219_10206668729295808_1230664567133213888_o.jpg','12191269_10206668723855672_357435831560478801_o.jpg','12191279_10206668721535614_5683223897711542232_o.jpg','12191363_10206668737496013_909248799659673111_o.jpg','12194503_10206668715975475_1873766085330366873_o.jpg','12194536_10206668710495338_7282989204876016334_o.jpg','12194663_10206668739176055_8869562405988474121_o.jpg','12194673_10206668728615791_4091839328208444499_o.jpg','12194726_10206668709295308_1150118102082206730_o.jpg','12194773_10206668729335809_3968361980216692111_o.jpg','12194782_10206668732295883_2451464580800432778_o.jpg','12194843_10206668722495638_3092156657969709628_o.jpg','12194877_10206668728535789_7724168334260812590_o.jpg','12194960_10206668712055377_6278549418942974341_o.jpg','12194970_10206668743136154_4371811175493226967_o.jpg','12195039_10206668718135529_3453780749155412560_o.jpg','12195067_10206668726175730_4811155405806318649_o.jpg','12195131_10206668724055677_2068200497741606497_o.jpg','12195134_10206668714575440_1732956247052911670_o.jpg'])},{n:'Pledge Week 2015'},{n:'Senior Farewell 2015',p:unshift(['11026107_10206293912405620_5258298160024985502_o.jpg','11882816_10206293840563824_4851327776809219530_o.jpg','11893912_10206293845403945_4626212825638134589_o.jpg','11921833_10206293838843781_438921678761751920_o.jpg','11922854_10206293912245616_6925256637856630036_o.jpg','11930925_10206293848644026_1089608805474813485_o.jpg','11935221_10206293845363944_4311969557114443757_o.jpg','11942220_10206293912445621_5352375481193633063_o.jpg','11947870_10206293911525598_1571484950307812131_o.jpg','11950155_10206293840483822_9166690086142243621_o.jpg','11951596_10206293912205615_8280431482029869165_o.jpg','11953345_10206293848764029_5304741326630547406_o.jpg'])},{n:'South Dakota Trip Spring',p:unshift(['1479152_10205393557697315_3267462613747638876_n.jpg','1510062_10205393555657264_3922520943711112381_n.jpg','10360709_10205393562417433_7076878592391997770_n.jpg','10409326_10205393563697465_1436911039139914577_n.jpg','10462906_10205393552017173_7929381767875646702_n.jpg','10689443_10205393559897370_1121663658155034880_n.jpg','10929206_10205393554537236_5936024703869808947_n.jpg','10952537_10205393560897395_2645899015025639735_n.jpg','10985052_10205393560257379_5437515990476888668_n.jpg','11014665_10205393564937496_8150961257385934195_n.jpg','11017450_10205393554857244_4726823992375691447_n.jpg','11021515_10205393561457409_3088196904437045621_n.jpg','11055275_10205393552057174_1184731716082444406_n.jpg','11055311_10205393556337281_6641224533494849605_n.jpg','11072698_10205393558337331_3504252203068096764_n.jpg','11082533_10205393551977172_4439259075026997872_n.jpg','11102999_10205393558537336_3344018348157932975_n.jpg','11111132_10205393562777442_2212897797647636639_n.jpg','11118367_10205393553257204_1343722550080674872_n.jpg','11148471_10205393558577337_3522864937341153917_n.jpg','11149365_10205393554057224_2820123432934414165_n.jpg','11149466_10205393557657314_2473098313305702091_n.jpg','11150750_10205393561737416_4921984407777361741_n.jpg','11156232_10205393561497410_2396490757143801598_n.jpg','11156419_10205393559537361_324520084168471833_n.jpg','11160575_10205393556377282_1472952638939968374_n.jpg','11168077_10205393553457209_5591835671643886240_n.jpg','11169920_10205393554497235_8857174390831765696_n.jpg','11170342_10205393565257504_4802339534156224405_n.jpg','11173324_10205393563377457_5973804879716985116_n.jpg','11174954_10205393556857294_8567647718253539695_n.jpg','11175007_10205393556017273_6894229629733352258_n.jpg','11178261_10205393553497210_9207345556386052034_n.jpg','11182030_10205393566017523_7042845280967790795_n.jpg'])},{n:'Spring Initiation',p:unshift(['22315_10205491261779856_3372487214750878616_n.jpg','1463064_10205491258819782_5014253895873616869_n.jpg','10929069_10205491260339820_232521425946746133_n.jpg','11006400_10205491260739830_8080350519453245841_n.jpg','11076998_10205491262219867_6401024506287661284_n.jpg','11148620_10205491258899784_9215904971505233923_n.jpg','11193407_10205491260299819_389706215009612521_n.jpg','11210521_10205491261739855_8395665379075150949_n.jpg','11245487_10205491260179816_2950451061784880661_n.jpg','11255751_10205491258859783_5427019370754782197_n.jpg'])}]},{n:'2014',a:[{n:'Pledge Week - Ice Skating',p:unshift(num(21))},{n:'Goggle Sales',p:unshift(num(2))},{n:'Activities Carnival',p:unshift(num(7))},{n:'Lady of Unity Show',p:unshift(num(36))},{n:'Initiation Spring 2014',p:unshift(['11705_10205393532416683_3164038330046625628_n.jpg','21989_10205393537496810_846558055583077784_n.jpg','1908180_10205393525496510_892586845905388490_n.jpg','10462935_10205393537136801_1832621174338375125_n.jpg','10575438_10205393528976597_3679028977779470330_o.jpg','10675742_10205393533576712_4196898288595839922_n.jpg','10906522_10205393535096750_8658085900003631167_n.jpg','11112935_10205393528656589_1391070638167444816_n.jpg','11113918_10205393531096650_6825474080853590688_n.jpg','11116487_10205393529456609_7566613904727411117_n.jpg','11136641_10205393527696565_6539525384559763197_n.jpg','11148322_10205393535296755_2115668882849106783_n.jpg','11149272_10205393539496860_3721911396658524025_n.jpg','11149322_10205393535576762_8649485500423806258_n.jpg','11149398_10205393525536511_6005338387003453306_n.jpg','11150395_10205393525456509_6950931934394953854_n.jpg','11150395_10205393527736566_8901661160957257516_n.jpg','11150590_10205393529896620_6734198968862118423_n.jpg','11156281_10205393524216478_6764330441104736806_n.jpg','11156406_10205393536896795_5751027335597538686_n.jpg','11156419_10205393534416733_8836551972740246220_n.jpg','11164773_10205393528456584_6373808324415298801_n.jpg','11169973_10205393530936646_502290414427080776_n.jpg','11174800_10205393524296480_2918398256921788411_n.jpg','11174837_10205393524256479_1374108016399081999_n.jpg','11175040_10205393533616713_7325655047649047619_n.jpg','11182134_10205393537856819_8091812752363338902_n.jpg'])}]},{n:'2013',a:[{n:'Secret Santa',p:unshift(num(44))},{n:'Formal At Delta Chapter',p:unshift(num(6))},{n:'Faculty Dinner',p:unshift(num(10))},{n:'Fall Initiation',p:unshift(num(20))},{n:'Expansion Trip',p:unshift(['2013-12-07 23.56.13-3.jpg','2013-12-07 23.56.37-2.jpg','2013-12-07 23.56.46-2.jpg','2013-12-07 23.57.05-2.jpg'])},{n:'Mall Show',p:unshift(num(137),new AlbumVideo('FUWXZSVsWxI'))},{n:'Kansas City Professional Group Picnic',p:unshift(num(7))},{n:'Spring Scavenger Hunt',p:unshift(num(123))},{n:'Piñata',p:unshift(['2013-05-09 18.39.31.jpg','2013-05-09 18.40.22.jpg','2013-05-09 18.43.15.jpg','2013-05-09 18.43.52.jpg','2013-05-09 18.44.05.jpg','2013-05-09 18.48.32.jpg'])},{n:'Fall Activity Fair',p:unshift(num(11))},{n:'Birthday Halloween',p:unshift(num(53))},{n:'Spring Initiation',p:unshift(num(21))},{n:'Open House',p:unshift(num(117))},{n:'Spring Pledging',p:unshift(num(56))},{n:'Composite Pictures',p:unshift(['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg','7.jpg','8.jpg','9.jpg','10.jpg','11.jpg','12.jpg','13.jpg','14.jpg','15.jpg','16.jpg','17.jpg','18.jpg','19.jpg','20.jpg','21.jpg','22.jpg','23.jpg','24.jpg','25.jpg','26.jpg','DavidMartin.jpg','FernandoNieto.jpg','GeorgePodaru.jpg','HarrisonSchmidt.jpg','JacobSchroeder.jpg','JennyBarriga.jpg','KatelynSalmans.jpg','KelseyCrow.jpg','KelsieCole.jpg','KendallKonrade.jpg','LauraMallonee.jpg','Lauren Conrow.jpg','PeterBetzen.jpg','SarahMunday.jpg','SeanSmith.jpg','TristanGrieves.jpg','VinhHoang.jpg'])},{n:'Glens Harem',p:unshift(num(7))},{n:'Professional Induction Ceremony',p:unshift(num(7))},{n:'Fall Formal Pledging',p:unshift(num(6))},{n:'Central District Conclave',p:unshift(num(44))},{n:'Fall Pledge Week',p:unshift(num(13))}]},{n:'2012',a:[{n:'Secret Santa',p:unshift(num(25))},{n:'Spring and Fall Initiations',p:unshift(num(9))},{n:'Birthday and Halloween',p:unshift(num(14))},{n:'Fall Pledge Week',p:unshift(num(9))},{n:'Putt Putt',p:unshift(num(9))},{n:'Professional Branch Induction',p:unshift(num(36))},{n:'Open House',p:unshift(num(107))},{n:'Mall Show',p:unshift(num(97))},{n:'Faculty Dinner',p:unshift(num(7))},{n:'Cosmosphere',p:unshift(num(20))},{n:'April 14th Show',p:unshift(num(54))},{n:'Periodic Table Cleanup',p:unshift(num(25))}]},{n:'2011',a:[{n:'Birthday and Halloween',p:unshift(num(18))},{n:'Fall and Spring Initiations',p:unshift(num(7))},{n:'Spring Potluck',p:unshift(num(2))},{n:'Mall Show',p:unshift(num(5))},{n:'Photo Scavenger Hunt',p:unshift(num(17))}]},{n:'2010',a:[{n:'Birthday Halloween',p:unshift(num(36))},{n:'Fall Pledging',p:unshift(num(16))},{n:'Conclave',p:unshift(num(33))},{n:'Open House',p:unshift(num(68))}],p:unshift(num(15))},{n:'2009',a:[{n:'Birthday Halloween',p:unshift(num(288))},{n:'Fall Rush Week',p:unshift(num(194))},{n:'Girl Scout Day',p:unshift(num(23))},{n:'Open House',p:unshift(num(359))},{n:'Demo Club',p:unshift(num(11))}]},{n:'2008',a:[{n:'Exploding Jayhawk',p:unshift(num(48),new AlbumVideo('Z3BLBK8dnYg'))},{n:'Charlie Brown',p:unshift(num(58),new AlbumVideo('LE-xU1rDrK0'))},{n:'Bowling',p:unshift(num(13))},{n:'Boy Scout Day',p:unshift(num(13))},{n:'Open House',p:unshift(num(29))},{n:'Random',p:unshift(num(38))}]},{n:'2007',a:[{n:'Marlatt Show',p:unshift(num(11))},{n:'Photo Scavenger Hunt',p:unshift(num(3))},{n:'Mini Golf',p:unshift(num(18))},{n:'Shows',p:unshift(num(6))}]},{n:'2006',a:[{n:'Haunted Hunt',p:unshift(num(49))},{n:'Boy Scout Day',p:unshift(num(39))},{n:'Bowling',p:unshift(num(11))},{n:'Shows',p:unshift(num(15))}],p:unshift(num(4))},{n:'2005',p:unshift(num(3))}/* End Initialize Albums */]
        viewModel.albumList.push.apply(viewModel.albumList, splitAlbums(albumList));
        var setAlbumPaths = function setAlbumPaths(album, path){
            album.path = path + (album.name ? "/" + album.name : "");
            for (var i = 0; i < album.albumList.length; ++i){
                setAlbumPaths(album.albumList[i], album.path);
                album.albumList[i].x.parent = album;
            }
        }
        setAlbumPaths(viewModel, "#");
    })();
    (function initializeFaq(){
/* Don't manually update here! Update faq.csv and run Update.ps1. */
/* Initialize Faq */
var a=function(question,answer){return new Faq(question,answer);};viewModel.faqList.push(a('Aren\'t fraternities just for men?','Although most fraternities for women call themselves sororities, fraternity is the more general term for a greek letter organization. We are a fraternity in the true sense of the word. All members are referred to as brothers, including our female members.'),a('What is a professional faternity?','A professional fraternity selects its members based on common professional goals and interests. The more common social fraternities choose their members based on similar social interests. However, professional fraternities can have just as much fun as social ones, just ask any one of our members.'),a('What is pledging?','You can join some organizations simply by filling out a form and mailing in your dues. Joining a fraternity is more work. Pledging is a process where a potential member associates with our fraternity for several months before becoming a brother. This gives both you and us a chance to get to know each other before we mutually agree that our fraternity is a good fit for you.'),a('Does AΧΣ Haze?','Absolutely not. As a professional fraternity, we have a zero-tolerance policy on hazing. Pledges who are uncomfortable with what is asked of them by a member of the fraternity should voice their concerns and, if necessary, report the matter to one of the fraternity officers.'),a('Is pledging fun?','We certainly hope so. If you don\'t enjoy pledging, you won\'t enjoy being a member either. If, unfortunately, you view coming to fraternity meetings and events a hassle rather than a time for fun, perhaps you might reconsider joining our fraternity.'),a('How much of a time commitment is pledging?','Expect to spend a minimum of three or four hours per week with your potential brothers and fellow pledges. We have mandatory pledge meetings once a week and recommended activities on some weekends. The time commitment is more than that to join most clubs, but much less than that to join a social fraternity. We will not wake you up at 5am to do push ups! The time commitment for pledging is meant to be the same as for a minimally active member. If you don\'t have time to pledge, you wont have time to be a member. All that being said, many pledges find themselves voluntarily spending more time with Alpha Chi Sigma than required. It\'s fun you\'ll see!'),a('What will I do as a pledge?','As a pledge you will have a \'big,\' an active member to act as mentor and help you through the pledging process. You\'ll have to learn a little about the fraternities history and alchemy (yes, you will be quizzed). Mostly though, you will be having fun and learning what brotherhood is all about. Pledge events include bowling, a potluck, trivia night, AΧΣ Jeopardy, and many more!'),a('Can I be a member of another fraternity or sorority if I join AΧΣ?','Since we are the only chemistry fraternity on campus, the answer is yes. In fact, several of our brothers are also in social fraternities and sororities.'),a('Is AΧΣ only at K-State?','No! There are about 50 chapters of AΧΣ all across the United States. Here\'s a <a href=\'http://www.alphachisigma.org\'>link</a> to the national web-site, and here\'s a <a href=\'http://www.alphachisigma.org/page.aspx?pid=262\'>link</a> to a list of our chapters.'),a('I\'m a grad student. Why would I want to associate with undergrads?','Well, first of all, we are not only undergrads. Many of our active members are graduate students. In fact, many professors are also AΧΣ brothers. Since we are a professional fraternity, we also have an active presence in industry and a number of professional chapters. AΧΣ is not just for undergrads, it\'s for life.'));
/* End Initialize Faq */
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
})(jQuery, ko);