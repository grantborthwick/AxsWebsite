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
    var Officer, Member, PledgeClass, Family, Album, AlbumPicture, Faq, ViewModel;
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
                if (self.x.parent && self.x.parent.x.path){
                    var path = self.x.parent.x.path();
                    path.push(self);
                    return path;
                } else {
                    return [self];
                }
            }
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
        };
        Faq = function(question, answer) {
            this.question = question;
            this.answer = answer;
        }
        ViewModel = function(){
            var self = this;
            self.lastUpdated = /* Initialize Today */new Date('02/22/2015 15:57:44');/* End Initialize Today */
            self.officerList = [];
            self.memberList = [];
            self.pledgeClassList = ko.observableArray().extend(pledgeClassSorting);
            self.familyList = [];
            self.albumList = [];
            self.faqList = [];
            
            self.debug = ko.observable(false);

            // todo: figure out the bug that removing this triggers...
            self.pictureList = [];
            
            self.x = function(){ };
            self.x.currentAlbum = ko.observable(this);
            self.x.currentAlbumItem = ko.observable();
            self.x.currentAlbumItemType = ko.observable();

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
        };
    })();
    var viewModel = new ViewModel();
    window.viewModel = viewModel;
    (function initializeOfficers(){
        /* Initialize Officers */var a=function(position,name,email,picture,classification,major){return new Officer(position,name,email,picture,classification,major);};viewModel.officerList.push(a('Master Alchemist','Krystal Duer','kmd1375@ksu.edu','images/officers/Krystal_Duer.jpg','Senior','Biological Systems Engineering and Pre-Med'),a('Vice Master Alchemist','Sarah Schuetze','schuetze@ksu.edu','images/officers/Sarah_Schuetze.jpg','Sophomore','Biological Systems Engineering'),a('Master of Ceremonies','Sara Joyce','sjoyce@ksu.edu','images/officers/Sara_Joyce.jpg','Sophomore','Chemistry, Pre-Pharmacy'),a('Outreach Coordinator','Harrison Schmidt','harrisonschmidt@icloud.com','images/officers/Harrison_Schmidt.jpg','Junior','Biology'),a('Assistant Outreach Coordinator','Andy Warner','alwarner@ksu.edu','images/officers/Andy_Warner.jpg','Sophomore','Chemistry'),a('Social Chair','John Rosa','jrrosa@ksu.edu','images/officers/John_Rosa.jpg','Junior','Chemistry, Pre-Pharmacy'),a('Recorder','Bailey Ward','baileyboo13p@ksu.edu','images/officers/Bailey_Ward.jpg','Sophomore','Biology and Pre-Pharmacy'),a('Treasurer','Christine Spartz','clspartz@ksu.edu','images/officers/Christine_Spartz.jpg','Junior','Chemistry'),a('Historian','Kelsie Cole','kelsiec@ksu.edu','images/officers/Kelsie_Cole.jpg','Sophomore','Biology, Pre-Dentistry '),a('Reporter','Rachel Quinnett','rquinnett@gmail.com','','Freshman','Chemical Engineering'),a('Webmaster','David Martin','dmarti56@ksu.edu','images/officers/David_Martin.jpg','Junior','Chemical Engineering'),a('Alumni Secretary','Sean Smith','sean46056@ksu.edu','images/officers/Sean_Smith.jpg','Freshman','Chemical Engineering'),a('Chapter Advisor','Emery Brown','emerybrown@ksu.edu','images/officers/Emery_Brown.jpg'),a('Chapter Advisor','Jim Hodgson','hodgson@ksu.edu','images/officers/Jim_Hodgson.jpg'),a('Chapter Advisor','Dr. Christopher Levy','clevy@ksu.edu','images/officers/Christopher_Levy.jpg'));/* End Initialize Officers */
    })();
    (function initializeMembers(){
        /* Initialize Members */var a=function(id,name,date,status,family,big,chapter){return new Member(id,name,date,status,family,big,chapter);};viewModel.memberList.push(a('0','Cleon Arrington','5/16/1964','Inactive','','','&Kappa;'),a('1','Clifton Meloan','5/16/1964','Inactive','','','&Kappa;'),a('2','David Bak','5/16/1964','Inactive','','','&Kappa;'),a('3','David Irvin','5/16/1964','Inactive','','','&Kappa;'),a('4','Dennis Schmidt','5/16/1964','Inactive','','','&Kappa;'),a('5','Donald Parker','5/16/1964','Inactive','','','&Kappa;'),a('6','Donald Rathburn','5/16/1964','Inactive','','','&Kappa;'),a('7','Donald Setser','5/16/1964','Inactive','','','&Kappa;'),a('8','James Weber','5/16/1964','Inactive','','','&Kappa;'),a('9','Jarrel Anderson','5/16/1964','Inactive','','','&Kappa;'),a('10','John Dillard','5/16/1964','Inactive','','','&Kappa;'),a('11','John Hassler','5/16/1964','Inactive','','','&Kappa;'),a('12','Jorge Olguin','5/16/1964','Inactive','','','&Kappa;'),a('13','Lewis Shadoff','5/16/1964','Inactive','','','&Kappa;'),a('14','Robert Winter','5/16/1964','Inactive','','','&Kappa;'),a('15','Theodore Tabor','5/16/1964','Inactive','','','&Kappa;'),a('16','Wayne Stukey','5/16/1964','Inactive','','','&Kappa;'),a('17','Wendell Burch','5/16/1964','Inactive','','','&Kappa;'),a('18','Wilford Stewart','5/16/1964','Inactive','','','&Kappa;'),a('19','James Mertz','1/16/1965','Inactive','','','&Kappa;'),a('20','Kenneth Wolma','1/16/1965','Inactive','','','&Kappa;'),a('21','Richard Johnson','1/16/1965','Inactive','','','&Kappa;'),a('22','Richard Steppel','1/16/1965','Inactive','','','&Kappa;'),a('23','Charles Foxx','5/1/1965','Inactive','','','&Kappa;'),a('24','Gary Stolzenberg','5/1/1965','Inactive','','','&Kappa;'),a('25','Lawrence Seibles','5/1/1965','Inactive','','','&Kappa;'),a('26','Adrian Daane','10/30/1965','Inactive'),a('27','Andreas Vikis','10/30/1965','Inactive'),a('28','David Manzo','10/30/1965','Inactive'),a('29','Gerald Dohm','10/30/1965','Inactive'),a('30','James Barnhart','10/30/1965','Inactive'),a('31','John Hagfeldt','10/30/1965','Inactive'),a('32','John Kotz','10/30/1965','Inactive'),a('33','John O&39;Brien','10/30/1965','Inactive'),a('34','Myron Jacobson','10/30/1965','Inactive'),a('35','Peter Pospisil','10/30/1965','Inactive'),a('36','Ronald Lam','10/30/1965','Inactive'),a('37','Gerald Davis','5/21/1966','Inactive'),a('38','James Curtis','5/21/1966','Inactive'),a('39','Richard Sullivan','5/21/1966','Inactive'),a('40','Robert Adams','5/21/1966','Inactive'),a('41','Andy Sae','12/10/1966','Inactive'),a('42','Claude Shinn','12/10/1966','Inactive'),a('43','Normal Craig','12/10/1966','Inactive'),a('44','Yadagiri Magavalli','12/10/1966','Inactive'),a('45','Eric Patterson','3/13/1967','Inactive'),a('46','James Lawless','3/13/1967','Inactive'),a('47','R. Jambunathan','3/13/1967','Inactive'),a('48','Stephen Mayfield','3/13/1967','Inactive'),a('49','Woei-Tih Huang','3/13/1967','Inactive'),a('50','Allan Ford','5/13/1967','Inactive'),a('51','David Roerig','5/13/1967','Inactive'),a('52','Don Morris','5/13/1967','Inactive'),a('53','Gary Muschik','5/13/1967','Inactive'),a('54','Nelson Wolfe','5/13/1967','Inactive'),a('55','Oliver Brown','5/13/1967','Inactive'),a('56','Ronald Madl','5/13/1967','Inactive'),a('57','Donald Hill','12/9/1967','Inactive'),a('58','Harold Wells','12/9/1967','Inactive'),a('59','Jar-Lin Kao','12/9/1967','Inactive'),a('60','Jeffrey Meyer','12/9/1967','Inactive'),a('61','Larry Seitz','12/9/1967','Inactive'),a('62','Robert Reitz','12/9/1967','Inactive'),a('63','Frederick Reynolds Jr.','5/25/1968','Inactive'),a('64','Nam Kuan','5/25/1968','Inactive'),a('65','Tyng-Fang Chien','5/25/1968','Inactive'),a('66','William Clark','5/25/1968','Inactive'),a('67','Robert Zanden','1/9/1970','Inactive'),a('68','Donald Bath','5/9/1970','Inactive'),a('69','James Richmond','5/9/1970','Inactive'),a('70','Robert Hale','5/9/1970','Inactive'),a('71','Ronald Albrecht','5/9/1970','Inactive'),a('72','William Friz','5/9/1970','Inactive'),a('73','Allan Childs','1/30/1971','Inactive'),a('74','Michael Rennekamp','1/30/1971','Inactive'),a('75','Raymond Blake','1/30/1971','Inactive'),a('76','Robert Bjercke','1/30/1971','Inactive'),a('77','Robert Jilka','1/30/1971','Inactive'),a('78','Yukio Kakuda','1/30/1971','Inactive'),a('79','David Ebert','2/5/1972','Inactive'),a('80','David Heying','2/5/1972','Inactive'),a('81','Paul Marcoux','2/5/1972','Inactive'),a('82','Bruce Durkee','2/3/1973','Inactive'),a('83','Cindy Newberry Childs','2/3/1973','Inactive'),a('84','Frederick Esch','2/3/1973','Inactive'),a('85','John Kirby','2/3/1973','Inactive'),a('86','Richard Everson','2/3/1973','Inactive'),a('87','Robert Moore','2/3/1973','Inactive'),a('88','Robert Onnen','2/3/1973','Inactive'),a('89','Robin Robins','2/3/1973','Inactive'),a('90','Robert, Jr. Mobley','9/29/1973','Inactive'),a('91','Ronald Kittle','9/29/1973','Inactive'),a('92','Sarah Kirton','9/29/1973','Inactive'),a('93','Arthur Metcalf','2/16/1974','Inactive'),a('94','Clinton Tolles','2/16/1974','Inactive'),a('95','Frank McClelland','2/16/1974','Inactive'),a('96','J. Enrique Velasco','2/16/1974','Inactive'),a('97','Jane Larsen','2/16/1974','Inactive'),a('98','Joseph Smith','2/16/1974','Inactive'),a('99','Ken Guyer','2/16/1974','Inactive'),a('100','Richard Entz','2/16/1974','Inactive'),a('101','Robert Miller','2/16/1974','Inactive'),a('102','Royce Alexander','2/16/1974','Inactive'),a('103','Geri Richmond','4/19/1974','Inactive'),a('104','Margaret Asirvatham','4/19/1974','Inactive'),a('105','Chris Duddard Rainey','2/15/1975','Inactive'),a('106','Jeffrey Dancer','2/15/1975','Inactive'),a('107','Madhuri K. Raut','2/15/1975','Inactive'),a('108','Richard Warner','2/15/1975','Inactive'),a('109','Roderick Bruckdorfer','2/15/1975','Inactive'),a('110','Steven Wallace','2/15/1975','Inactive'),a('111','Stuart Whitlock','2/15/1975','Inactive'),a('112','Wesley Workman','2/15/1975','Inactive'),a('113','Cadre Griffin','4/24/1976','Inactive'),a('114','Carolyn Kapplemann','4/24/1976','Inactive'),a('115','Dennis Nuzback','4/24/1976','Inactive'),a('116','Eddie Lustgarten','4/24/1976','Inactive'),a('117','Max A. Jones','4/24/1976','Inactive'),a('118','Jimmy Weishaar','12/4/1976','Inactive'),a('119','Kent Thomas','12/4/1976','Inactive'),a('120','Ronald Kodras','12/4/1976','Inactive'),a('121','Brian Hettrick','4/30/1977','Inactive'),a('122','Donna Triebe','4/30/1977','Inactive'),a('123','Harry Stenvall','4/30/1977','Inactive'),a('124','John Legere','4/30/1977','Inactive'),a('125','Paula Ravnikar','4/30/1977','Inactive'),a('126','Carol Malin','10/22/1977','Inactive'),a('127','Chris Null','10/22/1977','Inactive'),a('128','Christopher Southwick','10/22/1977','Inactive'),a('129','Dana Mathes','10/22/1977','Inactive'),a('130','Deborah Owen','10/22/1977','Inactive'),a('131','John Marks III','10/22/1977','Inactive'),a('132','Joseph Dietz','10/22/1977','Inactive'),a('133','Monty McCoy','10/22/1977','Inactive'),a('134','Pamela Brown','10/22/1977','Inactive'),a('135','Sookyong Kwak','10/22/1977','Inactive'),a('136','Micaela Engel','11/22/1977','Inactive'),a('137','Cynthia Schaller','4/29/1978','Inactive'),a('138','Frederick Triebe','4/29/1978','Inactive'),a('139','Kathy Gromer','4/29/1978','Inactive'),a('140','Larry Erickson','4/29/1978','Inactive'),a('141','Steven Roof','4/29/1978','Inactive'),a('142','Wayne Svoboda','4/29/1978','Inactive'),a('143','Alicia de Francisco','3/24/1979','Inactive'),a('144','Madakasira Subramanyam','3/24/1979','Inactive'),a('145','Michael Gilmore','3/24/1979','Inactive'),a('146','Michael Patrick Sharon','3/24/1979','Inactive'),a('147','Patrick McCluskey','3/24/1979','Inactive'),a('148','Rebecca Kenyon','3/24/1979','Inactive'),a('149','William Wiatt','3/24/1979','Inactive'),a('150','Alan Adam','12/1/1979','Inactive'),a('151','Bruce Randall Sebree','12/1/1979','Inactive'),a('152','Cynthia Claire (Hughes) Semple','12/1/1979','Inactive'),a('153','Harry Clark III','12/1/1979','Inactive'),a('154','Jerry Foropoulos Jr.','12/1/1979','Inactive'),a('155','Jonelle Palmer','12/1/1979','Inactive'),a('156','Paul Reddy','12/1/1979','Inactive'),a('157','Pradeep Iyer','12/1/1979','Inactive'),a('158','Randy Wehling','12/1/1979','Inactive'),a('159','James Gundersen','12/6/1980','Inactive'),a('160','Joseph Jilka','12/6/1980','Inactive'),a('161','Joseph Sack','12/6/1980','Inactive'),a('162','Prakash Rangnekar','12/6/1980','Inactive'),a('163','Rajendra Kulkarni','12/6/1980','Inactive'),a('164','Theodore Olson, Jr.','12/6/1980','Inactive'),a('165','Brian O&39;Brien','12/5/1981','Inactive'),a('166','Jeffrey Levin','12/5/1981','Inactive'),a('167','Anthony Schleisman','11/6/1982','Inactive'),a('168','Barton Bender','11/6/1982','Inactive'),a('169','Brent Fulton','11/6/1982','Inactive'),a('170','Dale Wheeler','11/6/1982','Inactive'),a('171','John Graham','11/6/1982','Inactive'),a('172','John Keane','11/6/1982','Inactive'),a('173','Michael Kramer','11/6/1982','Inactive'),a('174','Michael Wichman','11/6/1982','Inactive'),a('175','Robert C. Fry','11/6/1982','Inactive'),a('176','Robert Zoellner','11/6/1982','Inactive'),a('177','Allan W. Olsen','4/23/1983','Inactive'),a('178','David Devore','4/23/1983','Inactive'),a('179','Dean Vangalen','4/23/1983','Inactive'),a('180','Edward King','4/23/1983','Inactive'),a('181','Jeffry Ramsey','4/23/1983','Inactive'),a('182','Jennifer Bradford','4/23/1983','Inactive'),a('183','Joen (Steward) Schleisman','4/23/1983','Inactive'),a('184','Nancy Friederich','4/23/1983','Inactive'),a('185','R. David Jones','4/23/1983','Inactive'),a('186','Robert C. Lehman','4/23/1983','Inactive'),a('187','Ronald Fietkau','4/23/1983','Inactive'),a('188','Sanjay Wategaonkar','4/23/1983','Inactive'),a('189','Ven Shing Wang','4/23/1983','Inactive'),a('190','Alison Ann Fleming','4/14/1984','Inactive'),a('191','Calvin Mok-Yeun Tong','4/14/1984','Inactive'),a('192','David John Elliot','4/14/1984','Inactive'),a('193','David McCurdy','4/14/1984','Inactive'),a('194','Don Pivonka','4/14/1984','Inactive'),a('195','Jeffrey Streets','4/14/1984','Inactive'),a('196','Joseph Lichtenhan','4/14/1984','Inactive'),a('197','Karen (Klozenbucher) Wilson','4/14/1984','Inactive'),a('198','Melinda (Stevenson) Marquess','4/14/1984','Inactive'),a('199','Peggy J. McCann','4/14/1984','Inactive'),a('200','Rodney Cundiff','4/14/1984','Inactive'),a('201','Ana (Lisano) Hooker','10/27/1984','Inactive'),a('202','Barbara Markley','10/27/1984','Inactive'),a('203','David Macomber','10/27/1984','Inactive'),a('204','Eldon Smith','10/27/1984','Inactive'),a('205','Ibraheem Taiwo Badejo','10/27/1984','Inactive'),a('206','Jeffrey Edward Fox','10/27/1984','Inactive'),a('207','Joanna Czuchajowska','10/27/1984','Inactive'),a('208','Kimberly (Franz) Walker','10/27/1984','Inactive'),a('209','Mark Jordan','10/27/1984','Inactive'),a('210','Matthew Franklin','10/27/1984','Inactive'),a('211','Michael Conry','10/27/1984','Inactive'),a('212','Robert Freeman','10/27/1984','Inactive'),a('213','Thomas James Jewett','10/27/1984','Inactive'),a('214','Brenda (Smith) Rolfe','4/13/1985','Inactive'),a('215','Brock A. Luty','4/13/1985','Inactive'),a('216','Bryce Wisemiller','4/13/1985','Inactive'),a('217','Darcie Bailey','4/13/1985','Inactive'),a('218','David Ellis','4/13/1985','Inactive'),a('219','Eric Trump','4/13/1985','Inactive'),a('220','Guy Wilson','4/13/1985','Inactive'),a('221','Jeffrey McKie','4/13/1985','Inactive'),a('222','Jennifer Bales','4/13/1985','Inactive'),a('223','Mary Rezac','4/13/1985','Inactive'),a('224','Renee (Tevis) Smith','4/13/1985','Inactive'),a('225','Scott Bledsoe','4/13/1985','Inactive'),a('226','Albert Avila','10/26/1985','Inactive'),a('227','Anita Specht','10/26/1985','Inactive'),a('228','Beth Thomas','10/26/1985','Inactive'),a('229','Deborah (Dunz) Dozier','10/26/1985','Inactive'),a('230','Deborah Montgomery','10/26/1985','Inactive'),a('231','Janice Pinard','10/26/1985','Inactive'),a('232','John D. Peck','10/26/1985','Inactive'),a('233','Karren Church','10/26/1985','Inactive'),a('234','Laura Berry','10/26/1985','Inactive'),a('235','Lisa Eisele','10/26/1985','Inactive'),a('236','Martin Olberding','10/26/1985','Inactive'),a('237','Michelle Nee','10/26/1985','Inactive'),a('238','Obed N. Saint-Louis','10/26/1985','Inactive'),a('239','Sarah Roberts','10/26/1985','Inactive'),a('240','Steven Kohler','10/26/1985','Inactive'),a('241','Thomas Dean Zepp','10/26/1985','Inactive'),a('242','Todd Bielefeld','10/26/1985','Inactive'),a('243','Vincent Avila','10/26/1985','Inactive'),a('244','Barbara (Peirano) Spartz','4/19/1986','Inactive'),a('245','Becky (Fritsch) Leary','4/19/1986','Inactive'),a('246','Charles Butterfield','4/19/1986','Inactive'),a('247','Chris A. Schueler','4/19/1986','Inactive'),a('248','Donald Risley','4/19/1986','Inactive'),a('249','Elizabeth Wedeman','4/19/1986','Inactive'),a('250','George Mavridis','4/19/1986','Inactive'),a('251','Prakash Venkatesan','4/19/1986','Inactive'),a('252','Suchada Utamapanya','4/19/1986','Inactive'),a('253','Susan K. (Antrim) Feldhausen','4/19/1986','Inactive'),a('254','Allan Bohlke','11/1/1986','Inactive'),a('255','Curt H. Drennen','11/1/1986','Inactive'),a('256','Dale Coffin','11/1/1986','Inactive'),a('257','Donovan Miller','11/1/1986','Inactive'),a('258','Martin Spartz','11/1/1986','Inactive'),a('259','Thanh Dao','11/1/1986','Inactive'),a('260','Diane Hodges','4/11/1987','Inactive'),a('261','Joseph Richter','4/11/1987','Inactive'),a('262','Karyne Lynn (Luborne) Kern','4/11/1987','Inactive'),a('263','Mark Edward Rychlec','4/11/1987','Inactive'),a('264','Matthew Dassow','4/11/1987','Inactive'),a('265','Michelle Ruth Herman','4/11/1987','Inactive'),a('266','Sharon Brown','4/11/1987','Inactive'),a('267','Susan E. Goedecke','4/11/1987','Inactive'),a('268','Susan M. Smith','4/11/1987','Inactive'),a('269','Tracy Gulick','4/11/1987','Inactive'),a('270','Warren Kennedy','4/11/1987','Inactive'),a('271','William Patry','4/11/1987','Inactive'),a('272','Annette (Allen) Bollig','10/31/1987','Inactive'),a('273','James Everett Ruland','10/31/1987','Inactive'),a('274','Jay Irsik','10/31/1987','Inactive'),a('275','Jeff Debord','10/31/1987','Inactive'),a('276','Leigh Ann Kuhn','10/31/1987','Inactive'),a('277','Michael James Chisam','10/31/1987','Inactive'),a('278','Nancy Berry','10/31/1987','Inactive'),a('279','Randy Lynn Milford','10/31/1987','Inactive'),a('280','Sally Elizabeth Eckert','10/31/1987','Inactive'),a('281','Steven M. Hoynowski','10/31/1987','Inactive'),a('282','Debra Neel','4/8/1988','Inactive'),a('283','George Guise Jr.','4/8/1988','Inactive'),a('284','Henny Kesuma Sudirgio','4/8/1988','Inactive'),a('285','James Tate','4/8/1988','Inactive'),a('286','Julie (Bostater) Cox','4/8/1988','Inactive'),a('287','Leah (McCoy) Perry','4/8/1988','Inactive'),a('288','Leroy Page','4/8/1988','Inactive'),a('289','Michael Armour','4/8/1988','Inactive'),a('290','Shelli Letellier','4/8/1988','Inactive'),a('291','Tracy Skipton','4/8/1988','Inactive'),a('292','Vick Flowers','4/8/1988','Inactive'),a('293','Amy Taylor','10/21/1988','Inactive'),a('294','Andrew Lammers','10/21/1988','Inactive'),a('295','Barbara (Sly) Montgomery','10/21/1988','Inactive'),a('296','Cinthia (Green) Priest','10/21/1988','Inactive'),a('297','Daniel Prohaska','10/21/1988','Inactive'),a('298','Hank Lipps','10/21/1988','Inactive'),a('299','Karen A. Veverka','10/21/1988','Inactive'),a('300','Kristen Pforr','10/21/1988','Inactive'),a('301','Kristin (Good) Pforr','10/21/1988','Inactive'),a('302','L. Alayne (Ward) Burton','10/21/1988','Inactive'),a('303','Landra Kaye Gukeisen','10/21/1988','Inactive'),a('304','Mark Witkowski','10/21/1988','Inactive'),a('305','Suzanne Smykacs','10/21/1988','Inactive'),a('306','Ana (Bravo) Hooker','4/14/1989','Inactive'),a('307','Joe Rahija','4/14/1989','Inactive'),a('308','Kurt Pyle','4/14/1989','Inactive'),a('309','Pamela Stewart','4/14/1989','Inactive'),a('310','Cameron Epard','11/10/1989','Inactive'),a('311','Cory Gabel','11/10/1989','Inactive'),a('312','Csilla Duneczky','11/10/1989','Inactive'),a('313','Curtis Eric Grey','11/10/1989','Inactive'),a('314','Jennifer Wagner','11/10/1989','Inactive'),a('315','Jon Moore','11/10/1989','Inactive'),a('316','Justin Murphy','11/10/1989','Inactive'),a('317','Michael Raile','11/10/1989','Inactive'),a('318','Sergio A. Jimenez','11/10/1989','Inactive'),a('319','Gary Mallon','4/20/1990','Inactive'),a('320','Jean Schrader','4/20/1990','Inactive'),a('321','Robert A. Matejicka, Jr.','4/20/1990','Inactive'),a('322','Robert Leach','4/20/1990','Inactive'),a('323','Teresa (Rush) Scheuerman','4/20/1990','Inactive'),a('324','William Schluben','4/20/1990','Inactive'),a('325','Cheryl (Hodges) Marcotte','11/30/1990','Inactive'),a('326','Jennifer Reimer','11/30/1990','Inactive'),a('327','Veronica Tuttle','11/30/1990','Inactive'),a('328','Bill Weatherford','4/12/1991','Inactive'),a('329','Jeffrey Zoelle','4/12/1991','Inactive'),a('330','Michael Riblett','4/12/1991','Inactive'),a('331','Thomas Nielsen','4/12/1991','Inactive'),a('332','Virginia (Dahl) Makepeace','4/12/1991','Inactive'),a('333','Heather Adams','11/22/1991','Inactive'),a('334','Jessica Beal','11/22/1991','Inactive'),a('335','Kathy (Alexander) Rasmussen','11/22/1991','Inactive'),a('336','Kiersten Saal','11/22/1991','Inactive'),a('337','Lana Knedlik','11/22/1991','Inactive'),a('338','Rachel (Hamman) Benjamin','11/22/1991','Inactive'),a('339','Richard Hilgenfeld','11/22/1991','Inactive'),a('340','Ryan Cole','11/22/1991','Inactive'),a('341','Scott Smiley','11/22/1991','Inactive'),a('342','Shawn Bauer','11/22/1991','Inactive'),a('343','Stacy (Mull) Balzer','11/22/1991','Inactive'),a('344','Todd B. Meier','11/22/1991','Inactive'),a('345','Daniel A. Sommers','4/24/1992','Inactive'),a('346','James Pletcher','4/24/1992','Inactive'),a('347','Jarad Daniels','4/24/1992','Inactive'),a('348','Jason Smee','4/24/1992','Inactive'),a('349','Jonathan Newton','4/24/1992','Inactive'),a('350','Mike Rooke','4/24/1992','Inactive'),a('351','Barbara Gray','11/13/1992','Inactive'),a('352','Brandy Meyer','11/13/1992','Inactive'),a('353','Clayton Lowe','11/13/1992','Inactive'),a('354','Craig Behnke','11/13/1992','Inactive'),a('355','Kevin Stokes','11/13/1992','Inactive'),a('356','Melissa Simms','11/13/1992','Inactive'),a('357','Nicholas Alex Ruth','11/13/1992','Inactive'),a('358','Pamela (Howell) Goble','11/13/1992','Inactive'),a('359','Scott Rottinghaus','11/13/1992','Inactive'),a('360','Brandon Newell','4/16/1993','Inactive'),a('361','Bryce Williams','4/16/1993','Inactive'),a('362','Carrie Brucken','4/16/1993','Inactive'),a('363','Cheryl Wendell','4/16/1993','Inactive'),a('364','Cody C. Shrader','4/16/1993','Inactive'),a('365','Heather (Veith) Rectanus','4/16/1993','Inactive'),a('366','Jan Arbogast','4/16/1993','Inactive'),a('367','Jason Dana','4/16/1993','Inactive'),a('368','Joey Schriner','4/16/1993','Inactive'),a('369','John Schimke','4/16/1993','Inactive'),a('370','Tim Hubin','4/16/1993','Inactive'),a('371','Anita Freed','11/19/1993','Inactive'),a('372','Gregory Latham','11/19/1993','Inactive'),a('373','James L. Neff','11/19/1993','Inactive'),a('374','Marlo Hoffman','11/19/1993','Inactive'),a('375','Nancy Anderson','11/19/1993','Inactive'),a('376','Daniel Krische','4/29/1994','Inactive'),a('377','David Droegemueller','4/29/1994','Inactive'),a('378','Joseph Schmidt','4/29/1994','Inactive'),a('379','Chad Magee','11/18/1994','Inactive'),a('380','Emily Walker','11/18/1994','Inactive'),a('381','Steven Lonard','11/18/1994','Inactive'),a('382','Andreas Dowling','4/21/1995','Inactive'),a('383','Christopher Mack','4/21/1995','Inactive'),a('384','Darin Elliott','4/21/1995','Inactive'),a('385','Edward Pokorski','4/21/1995','Inactive'),a('386','Jill Goering','4/21/1995','Inactive'),a('387','Julie Crabtree','4/21/1995','Inactive'),a('388','Kevin Diehl','4/21/1995','Inactive'),a('389','Robert J. Rounbehler','4/21/1995','Inactive'),a('390','Sally Kay Wallis','4/21/1995','Inactive'),a('391','Scott C. Warren','4/21/1995','Inactive'),a('392','Andrew McLenon','12/1/1995','Inactive'),a('393','Anna Riblett','12/1/1995','Inactive'),a('394','Bonna Cannon','12/1/1995','Inactive'),a('395','Claude Story','12/1/1995','Inactive'),a('396','Colin Kilbane','12/1/1995','Inactive'),a('397','Derek Peine','12/1/1995','Inactive'),a('398','Earline Dikeman','12/1/1995','Inactive'),a('399','Elizabeth D. Hochberg','12/1/1995','Inactive'),a('400','Joel P. White','12/1/1995','Inactive'),a('401','John Herber','12/1/1995','Inactive'),a('402','Kevin Langenwalter','12/1/1995','Inactive'),a('403','Kristy Rizek','12/1/1995','Inactive'),a('404','Lara Domzalski','12/1/1995','Inactive'),a('405','Maryanne Collinson','12/1/1995','Inactive'),a('406','Michelle Menke','12/1/1995','Inactive'),a('407','Pedro Muino','12/1/1995','Inactive'),a('408','Peter Schebler','12/1/1995','Inactive'),a('409','Rachel (Niles) Dougherty','12/1/1995','Inactive'),a('410','Randall Fields','12/1/1995','Inactive'),a('411','Robert Brandt','12/1/1995','Inactive'),a('412','Annette Lewis','4/26/1996','Inactive'),a('413','Chris Sheeran','4/26/1996','Inactive'),a('414','Jason Hartman','4/26/1996','Inactive'),a('415','Rounak Mikha','4/26/1996','Inactive'),a('416','Shawn Torrez','4/26/1996','Inactive'),a('417','Tami Wachsnicht','4/26/1996','Inactive'),a('418','Ahmad Audi','11/15/1996','Inactive'),a('419','Corrie Carnes','11/15/1996','Inactive'),a('420','Darren Von Goedeke','11/15/1996','Inactive'),a('421','Diane (Stubbs) Diehl','11/15/1996','Inactive'),a('422','Erika Johnson','11/15/1996','Inactive'),a('423','Katie Surowski','11/15/1996','Inactive'),a('424','Kenneth Drake','11/15/1996','Inactive'),a('425','Matthew Kreps','11/15/1996','Inactive'),a('426','Megan White','11/15/1996','Inactive'),a('427','Minh Tran','11/15/1996','Inactive'),a('428','Natalie Gosch','11/15/1996','Inactive'),a('429','Phillip Tasset','11/15/1996','Inactive'),a('430','Scott D. Schroeder','11/15/1996','Inactive'),a('431','Amanda Simpson','4/25/1997','Inactive'),a('432','Andrew Beard','4/25/1997','Inactive'),a('433','Bonnie Nixon','4/25/1997','Inactive'),a('434','Brandon Oberling','4/25/1997','Inactive'),a('435','David Woemmel','4/25/1997','Inactive'),a('436','Dennis Hellon','4/25/1997','Inactive'),a('437','Destin Leinen','4/25/1997','Inactive'),a('438','Doug Lupher','4/25/1997','Inactive'),a('439','Keith Buszek','4/25/1997','Inactive'),a('440','Margo Hood','4/25/1997','Inactive'),a('441','Matt Olson','4/25/1997','Inactive'),a('442','Nathan Stockman','4/25/1997','Inactive'),a('443','Ruth (Alexander) Platt','4/25/1997','Inactive'),a('444','Scott D. Greenway','4/25/1997','Inactive'),a('445','Tony Bieker','4/25/1997','Inactive'),a('446','Zarry Tavakkol','4/25/1997','Inactive'),a('447','Brian Helfrich','11/21/1997','Inactive'),a('448','Dana (Fitzemeier) Krueger','11/21/1997','Inactive'),a('449','Daniel Felker','11/21/1997','Inactive'),a('450','Jacqueline Pettersch','11/21/1997','Inactive'),a('451','James McGill','11/21/1997','Inactive'),a('452','Kelly-Ann Buszek','11/21/1997','Inactive'),a('453','Kristin Kay Ecord','11/21/1997','Inactive'),a('454','Laurie Peterson','11/21/1997','Inactive'),a('455','Mark Cross','11/21/1997','Inactive'),a('456','Micah Alexander','11/21/1997','Inactive'),a('457','Wade Takeguchi','11/21/1997','Inactive'),a('458','James Wassenberg','4/14/1998','Inactive'),a('459','Nathan Chaffin','4/14/1998','Inactive'),a('460','Brandon Moore','4/17/1998','Inactive'),a('461','Chet Davidson','4/17/1998','Inactive'),a('462','Dan Higgins','4/17/1998','Inactive'),a('463','Eric Wika','4/17/1998','Inactive'),a('464','James Hodgson','4/17/1998','Inactive'),a('465','Kale Needham','4/17/1998','Inactive'),a('466','Kara Dunn','4/17/1998','Inactive'),a('467','Kent Meinhardt','4/17/1998','Inactive'),a('468','Matthew Lofgreen','4/17/1998','Inactive'),a('469','Adnan Abu-Yousif','11/20/1998','Inactive'),a('470','Andrew Ohmes','11/20/1998','Inactive'),a('471','Ben Peters','11/20/1998','Inactive'),a('472','Brian Jindra','11/20/1998','Inactive'),a('473','Cammy Lees','11/20/1998','Inactive'),a('474','Jason Goodin','11/20/1998','Inactive'),a('475','Molly Magill','11/20/1998','Inactive'),a('476','Paul Baures','11/20/1998','Inactive'),a('477','Peter J. Pauzauskie','11/20/1998','Inactive'),a('478','Richard Harris','11/20/1998','Inactive'),a('479','William Hodges','11/20/1998','Inactive'),a('480','Abhishekh Govind','4/30/1999','Inactive'),a('481','James Bennett','4/30/1999','Inactive'),a('482','Ryan Livengood','4/30/1999','Inactive'),a('483','Tyler Grindal','4/30/1999','Inactive'),a('484','William Stone','4/30/1999','Inactive'),a('485','Abra Birchall','11/12/1999','Inactive'),a('486','Amanda Eberth','11/12/1999','Inactive'),a('487','Dane Kohrs','11/12/1999','Inactive'),a('488','David Heroux','11/12/1999','Inactive'),a('489','Vladimir Yevseyenkov','11/12/1999','Inactive'),a('490','Patti Lewis','11/14/1999','Inactive'),a('491','Tamara Munsch','11/15/1999','Inactive'),a('492','Benjamin Champion','4/7/2000','Inactive'),a('493','Brian Novak','4/7/2000','Inactive'),a('494','David Hart','4/7/2000','Inactive'),a('495','David Razafsky','4/7/2000','Inactive'),a('496','Jeff Pierson','4/7/2000','Inactive'),a('497','Nisa Lafferty','4/7/2000','Inactive'),a('498','Steven Powell','4/7/2000','Inactive'),a('499','Erik Warnken','11/4/2000','Inactive'),a('500','Heidi Mueldener','11/4/2000','Inactive'),a('501','Kultida Varaphan','11/4/2000','Inactive'),a('502','Megan Drovetta','11/4/2000','Inactive'),a('503','Nolan Malthesen','11/4/2000','Inactive'),a('504','Sharon Kimball','11/4/2000','Inactive'),a('505','Alison Dopps','3/30/2001','Inactive'),a('506','Crystal Fullerton','3/30/2001','Inactive'),a('507','Elizabeth Rayburn','3/30/2001','Inactive'),a('508','Fonda Koehn','3/30/2001','Inactive'),a('509','John Erkmann','3/30/2001','Inactive'),a('510','John Worden','3/30/2001','Inactive'),a('511','Kevin Bass','3/30/2001','Inactive'),a('512','Matt Harmon','3/30/2001','Inactive'),a('513','Megan Johnson','3/30/2001','Inactive'),a('514','Rebecca Knott','3/30/2001','Inactive'),a('515','Shane Tracy','3/30/2001','Inactive'),a('516','Thomas Bays','3/30/2001','Inactive'),a('517','Tracie Munsch','3/30/2001','Inactive'),a('518','Tyler McGown','3/30/2001','Inactive'),a('519','Alexander Smetana','11/9/2001','Inactive'),a('520','Cameron (Fahrenholtz) Jeter','11/9/2001','Inactive'),a('521','John Latham','11/9/2001','Inactive'),a('522','Molly Bing','11/9/2001','Inactive'),a('523','Robyn Moore','11/9/2001','Inactive'),a('524','Adam Brooks','4/13/2002','Inactive'),a('525','Amanda Sells','4/13/2002','Inactive'),a('526','Courtney Boysen','4/13/2002','Inactive'),a('527','Gustavo Seabra','4/13/2002','Inactive'),a('528','Hannah Adamson','4/13/2002','Inactive'),a('529','Janie Salmon','4/13/2002','Inactive'),a('530','Jessica Facer','4/13/2002','Inactive'),a('531','Jill (Sowers) Neitzel','4/13/2002','Inactive'),a('532','Kate Dooley','4/13/2002','Inactive'),a('533','Lauren (Taylor) Watts','4/13/2002','Inactive'),a('534','Leigh Fine','4/13/2002','Inactive'),a('535','Amy LaGesse','11/22/2002','Inactive'),a('536','Bryan Watts','11/22/2002','Inactive'),a('537','Jordan Fowler','11/22/2002','Inactive'),a('538','Katherine McKenzie','11/22/2002','Inactive'),a('539','Leila McKenzie','11/22/2002','Inactive'),a('540','Slava Zakjevskii Jr.','11/22/2002','Inactive'),a('541','Tanner Callender','11/22/2002','Inactive'),a('542','Alexandria Dunn','4/11/2003','Inactive'),a('543','Amanda Meyer','4/11/2003','Inactive'),a('544','Amy Johnston','4/11/2003','Inactive'),a('545','Christopher Bradwell','4/11/2003','Inactive'),a('546','Eric Banner','4/11/2003','Inactive'),a('547','Gina Mercurio','4/11/2003','Inactive'),a('548','Kristin Ohnmacht','4/11/2003','Inactive'),a('549','Meghan Hampton','4/11/2003','Inactive'),a('550','Sara Hoffman','4/11/2003','Inactive'),a('551','Shawnalea Frazier','4/11/2003','Inactive'),a('552','William Sanders','4/11/2003','Inactive'),a('553','Andrea Wosel','11/21/2003','Inactive'),a('554','Anne Kancel','11/21/2003','Inactive'),a('555','Cecilia Ariga Kerubo','11/21/2003','Inactive'),a('556','Christopher Rice','11/21/2003','Inactive'),a('557','Holly Mayer','11/21/2003','Inactive'),a('558','Johni (Lee) Curts','11/21/2003','Inactive'),a('559','Justin Raybern','11/21/2003','Inactive'),a('560','Marsha McDade','11/21/2003','Inactive'),a('561','Nathan Moore','11/21/2003','Inactive'),a('562','Ryan Peck','11/21/2003','Inactive'),a('563','Shannon Stadler','11/21/2003','Inactive'),a('564','Shelby Lies','11/21/2003','Inactive'),a('565','Andrew Jurgensmeier','4/30/2004','Inactive'),a('566','Daniel Sanford','4/30/2004','Inactive'),a('567','David Liang','4/30/2004','Inactive'),a('568','Erin Hemphill','4/30/2004','Inactive'),a('569','Evin (Worthington) Alcindor','4/30/2004','Inactive'),a('570','James Latta','4/30/2004','Inactive'),a('571','Joshua Pritts','4/30/2004','Inactive'),a('572','Justin Cunningham','4/30/2004','Inactive'),a('573','Katherine Shaeffer','4/30/2004','Inactive'),a('574','Kyle Swanson','4/30/2004','Inactive'),a('575','Lucinda Sullivan','4/30/2004','Inactive'),a('576','Meg Fasulo','4/30/2004','Inactive'),a('577','Samuel King','4/30/2004','Inactive'),a('578','Sandy Stich','4/30/2004','Inactive'),a('579','Willie Barrow','4/30/2004','Inactive'),a('580','Alyssa Newth','11/19/2004','Inactive'),a('581','Alyssa Warneke','11/19/2004','Inactive'),a('582','Ben Winter','11/19/2004','Inactive'),a('583','Brette Cochenour','11/19/2004','Inactive'),a('584','Charles Krumins','11/19/2004','Inactive'),a('585','Hillary Pounds','11/19/2004','Inactive'),a('586','Katrina Pekar-Carpenter','11/19/2004','Inactive'),a('587','Kimberly Lovell','11/19/2004','Inactive'),a('588','Kyle Smith','11/19/2004','Inactive'),a('589','Lindsay Hall','11/19/2004','Inactive'),a('590','Lydia Barrigan','11/19/2004','Inactive'),a('591','Megan Hillebrand','11/19/2004','Inactive'),a('592','Nadja Joergensen','11/19/2004','Inactive'),a('593','Nelson Green','11/19/2004','Inactive'),a('594','Prachi Gupta','11/19/2004','Inactive'),a('595','Sara Rans','11/19/2004','Inactive'),a('596','Teresa Wilson','11/19/2004','Inactive'),a('597','Zachary Jepson','11/19/2004','Inactive'),a('598','Neal Friesen','12/4/2004','Inactive'),a('599','Timothy Dunn','12/4/2004','Inactive','','','&Alpha;&Theta;'),a('600','Adam Kretzer','4/29/2005','Inactive'),a('601','Amy Twite','4/29/2005','Inactive'),a('602','Daniel Madgwick','4/29/2005','Inactive'),a('603','Jerod Junghans','4/29/2005','Inactive'),a('604','Kelly Reinecke','4/29/2005','Inactive'),a('605','Lance Williamson','4/29/2005','Inactive'),a('606','Laura Grauer','4/29/2005','Inactive'),a('607','Mark Banker','4/29/2005','Inactive'),a('608','Melissa Veldman','4/29/2005','Inactive'),a('609','Tony Kuckelman','4/29/2005','Inactive'),a('610','Trapper Callender','4/29/2005','Inactive'),a('611','Allison Hadley','12/2/2005','Inactive'),a('612','Brianna Barnes','12/2/2005','Inactive'),a('613','Christopher Culbertson','12/2/2005','Inactive'),a('614','Christopher Levy','12/2/2005','Inactive'),a('615','Elizabeth Blaesi','12/2/2005','Inactive'),a('616','Joseph Atkins','12/2/2005','Inactive'),a('617','Joseph V. Ortiz','12/2/2005','Inactive'),a('618','Katie Simmons','12/2/2005','Inactive'),a('619','Laura Platt','12/2/2005','Inactive'),a('620','Sarah Shultz','12/2/2005','Inactive'),a('621','Stefan Kraft','12/2/2005','Inactive'),a('622','Sundeep Rayat','12/2/2005','Inactive'),a('623','Takashi Ito','12/2/2005','Inactive'),a('624','Taryn Meyer','12/2/2005','Inactive'),a('625','Alicia Linhardt','3/31/2006','Inactive'),a('626','Andrew Kerns','3/31/2006','Inactive'),a('627','Jeanne Pierzynski','3/31/2006','Inactive'),a('628','Mark Battig','3/31/2006','Inactive'),a('629','Meredith (Smythe) Linhardt','3/31/2006','Inactive'),a('630','Tara Kalivoda','3/31/2006','Inactive'),a('631','Tess Blankenship','3/31/2006','Inactive'),a('632','Theresa Marchioni','3/31/2006','Inactive'),a('633','Caitlin Palko','11/17/2006','Inactive'),a('634','Jennifer Stegman','11/17/2006','Inactive'),a('635','Kathryn Brewer','11/17/2006','Inactive'),a('636','Melissa Waller','11/17/2006','Inactive'),a('637','Robert Christian','11/17/2006','Inactive'),a('638','Sara Powell','11/17/2006','Inactive'),a('639','Stefan Bossmann','11/17/2006','Inactive'),a('640','Andrew Brown','4/20/2007','Inactive'),a('641','Ariel Burns','4/20/2007','Inactive'),a('642','Christopher Jones','4/20/2007','Inactive'),a('643','Lucas Carpenter','4/20/2007','Inactive'),a('644','Pinakin Sukthankar','4/20/2007','Inactive'),a('645','Tyler Koehn','4/20/2007','Inactive'),a('646','Brendan Lund','11/16/2007','Inactive'),a('647','Brenton Shanks','11/16/2007','Inactive'),a('648','Christopher Tuinenga','11/16/2007','Inactive'),a('649','Glenda Hutchison','11/16/2007','Inactive'),a('650','Hallie Botter','11/16/2007','Inactive'),a('651','Hannah Johnson','11/16/2007','Inactive'),a('652','Jackie Johnson','11/16/2007','Inactive'),a('653','Jared Wilmoth','11/16/2007','Inactive'),a('654','Jithma Abeykoon','11/16/2007','Inactive'),a('655','Kelsey Pearson','11/16/2007','Inactive'),a('656','Ryan Hill','11/16/2007','Inactive'),a('657','Stephanie Alderman-Oler','11/16/2007','Inactive'),a('658','Cara Katzer','4/11/2008','Inactive'),a('659','Hayes Charles','4/11/2008','Inactive'),a('660','Anna Rogers','11/21/2008','Inactive'),a('661','Ashley Bili','11/21/2008','Inactive'),a('662','Barbara Braga','11/21/2008','Inactive'),a('663','Colette Robinson','11/21/2008','Inactive'),a('664','Kraig Sells','11/21/2008','Inactive'),a('665','Laura Grayson','11/21/2008','Inactive'),a('666','Maria Pinilla','11/21/2008','Inactive'),a('667','Natasha Mai-Bowmaker','11/21/2008','Inactive'),a('668','Nathan Peterman','11/21/2008','Inactive'),a('669','P. Lankika Goff','11/21/2008','Inactive'),a('670','Sophia Thompson','11/21/2008','Inactive'),a('671','Theresia McCollum','11/21/2008','Inactive'),a('672','Emery Brown','4/1/2009','Active','','','&Gamma;&Theta;'),a('673','Christian Montes','5/1/2009','Active'),a('674','Karsten Evans','5/1/2009','Inactive'),a('675','Kendrea Bensel','5/1/2009','Inactive'),a('676','Leonie Bossmann','5/1/2009','Inactive'),a('677','Danielle Conover','11/20/2009','Inactive'),a('678','Jon Adams','11/20/2009','Inactive'),a('679','Josh Neufeld','11/20/2009','Inactive'),a('680','Katelyn Kuecker','11/20/2009','Inactive'),a('681','Leila Maurmann','11/20/2009','Inactive'),a('682','Meghan Kelly','11/20/2009','Inactive'),a('683','Victor Chikan','11/20/2009','Inactive'),a('684','Adam Schondelmaier','4/16/2010','Inactive'),a('685','Akeem Giles','4/16/2010','Inactive'),a('686','Allison Meyer','4/16/2010','Inactive'),a('687','Angela Grommet','4/16/2010','Inactive'),a('688','Cameron Finch','4/16/2010','Inactive'),a('689','Chloe Callahan','4/16/2010','Inactive'),a('690','Glenn Hafenstine','4/16/2010','Inactive'),a('691','Jessica Long','4/16/2010','Inactive'),a('692','Megan Peterson','4/16/2010','Inactive'),a('693','Parker Rayl','4/16/2010','Inactive'),a('694','Stephen Zuiss','4/16/2010','Inactive'),a('695','Aaron Schmidt','12/3/2010','Inactive'),a('696','Anthony Ralston','12/3/2010','Inactive'),a('697','Caitlin Moses','12/3/2010','Inactive'),a('698','Chancellor Deviney','12/3/2010','Active','Lead'),a('699','Daniel Tye','12/3/2010','Inactive'),a('700','Elizabeth Lowry','12/3/2010','Inactive'),a('701','Eric Geanes','12/3/2010','Active','Mercury'),a('702','Rebecca Taylor','12/3/2010','Active','Lead'),a('703','Samantha Talley','12/3/2010','Active'),a('704','Sterling Braun','12/3/2010','Inactive'),a('705','XiangYi Xia','12/3/2010','Inactive'),a('706','Andrew Kipp','4/30/2011','Inactive'),a('707','Brianne Pierce','4/30/2011','Active','Gold'),a('708','Chris Harrington','4/30/2011','Inactive'),a('709','Dakota Bixler','4/30/2011','Inactive'),a('710','Emma Brace','4/30/2011','Active','Copper'),a('711','Grant Borthwick','4/30/2011','Active','Iron'),a('712','Jessica Martin','4/30/2011','Active'),a('713','Katherine Gentry','4/30/2011','Active','Gold'),a('714','Pamela Maynez','4/30/2011','Inactive'),a('715','Allison Johnson','12/3/2011','Active'),a('716','Denise Cobb','12/3/2011','Active','Lead'),a('717','John Nail','12/3/2011','Active'),a('718','Krystal Duer','12/3/2011','Active','Silver'),a('719','Marlena Birkel','12/3/2011','Inactive'),a('720','Megan Crawshaw','12/3/2011','Active'),a('721','Megan Kelley','12/3/2011','Active'),a('722','Alexis Tucker','4/28/2012','Inactive'),a('723','Christine Spartz','4/28/2012','Active','Copper'),a('724','Kasen Lee','4/28/2012','Active'),a('725','Matthew Ford','4/28/2012','Inactive'),a('726','Taylor Fetrow','4/28/2012','Active','Tin'),a('727','Taylor Stackley','4/28/2012','Inactive'),a('728','Zachary Mason','4/28/2012','Inactive'),a('729','Andrew Warner','11/10/2012','Active','Iron','711'),a('730','Chris Cox','11/10/2012','Active','Tin','726'),a('731','John Rosa','11/10/2012','Active','Lead','716'),a('732','Kali Hinman','11/10/2012','Active','Copper','710'),a('733','Matthew Reynolds','11/10/2012','Active','Mercury','701'),a('734','Sara Joyce','11/10/2012','Active','Silver','718'),a('735','Amanda Nelson','4/27/2013','Active','Mercury','733'),a('736','Andrew Nigh','4/27/2013','Active','Silver','734'),a('737','Bailey Ward','4/27/2013','Active','Gold','713'),a('738','James Balthazor','4/27/2013','Active','Lead','716'),a('739','Logan Harrold','4/27/2013','Active','Copper','710'),a('740','Macy Garcia','4/27/2013','Active','Mercury','701'),a('741','Sarah Schuetze','4/27/2013','Active','Iron','729'),a('742','David Martin','11/16/2013','Active','Mercury','701'),a('743','Fernando Nieto','11/16/2013','Active','Lead','698'),a('744','George Podaru','11/16/2013','Active','Tin','726'),a('745','Harrison Schmidt','11/16/2013','Active','Gold','713'),a('746','Jacob Schroeder','11/16/2013','Active','Copper','710'),a('747','Jenny Barriga','11/16/2013','Active','Gold','707'),a('748','Katelyn Salmans','11/16/2013','Active','Iron','741'),a('749','Kelsey Crow','11/16/2013','Active','Gold','737'),a('750','Kelsie Cole','11/16/2013','Active','Silver','736'),a('751','Kendall Konrade','11/16/2013','Active','Silver','718'),a('752','Laura Mallonee','11/16/2013','Active','Mercury','735'),a('753','Lauren Conrow','11/16/2013','Active','Gold','707'),a('754','Peter Betzen','11/16/2013','Active','Mercury','701'),a('755','Rachel Quinnett','11/16/2013','Active','Tin','730'),a('756','Regan Konz','11/16/2013','Active','Gold','713'),a('757','Riley Emley','11/16/2013','Active','Copper','710'),a('758','Sarah Munday','11/16/2013','Active','Lead','702'),a('759','Sean Smith','11/16/2013','Active','Mercury','733'),a('760','Tristan Grieves','11/16/2013','Active','Iron','711'),a('761','Vinh Hoang','11/16/2013','Active','Iron','729'));/* End Initialize Members */
        // Organize by pledge class
        var basePledgeSrc = "images/pledgeClasses/";
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
            {date: "11/16/2013", src: "2013f.jpg"}];
        for (var i = 0; i < classes.length; ++i){
            var pledgeClass = new PledgeClass(classes[i].date, basePledgeSrc + classes[i].src);
            viewModel.pledgeClassList[pledgeClass.semester] = pledgeClass;
            viewModel.pledgeClassList.push(pledgeClass);
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
        // new Album(name, [pictures], [children])
        // new AlbumPicture(src)
        var initializeSubAlbums = function(name, baseSrc, src, subAlbums){
            var ret = new Album(name);
            src = src || name.replace(/\W/g, "");
            for (var i = 0; i < subAlbums.length; ++i){
                var subAlbum = new Album(subAlbums[i].name);
                subAlbums[i].src = subAlbums[i].src || subAlbums[i].name.replace(/\W/g, "");
                for (var j = 1; j <= subAlbums[i].count; ++j){
                    subAlbum.pictureList.push(new AlbumPicture(baseSrc + "/" + src + "/" + subAlbums[i].src + "/" + j + ".jpg"));
                }
                ret.albumList.push(subAlbum);
            }
            return ret;
        }
        var baseSrc = "http://www.k-state.edu/axsigma/Albums";
        viewModel.albumList.push(
            initializeSubAlbums("2015", baseSrc, undefined, []),
            initializeSubAlbums("2014", baseSrc, undefined, [
                {name: "Pledge Week - Ice Skating", count: 21},
                {name: "Goggle Sales", count: 2},
                {name: "Activities Carnival", count: 7},
                {name: "Lady of Unity Show", count: 36}
            ]),
            initializeSubAlbums("2013", baseSrc, undefined, [
                {name: "Secret Santa", count: 44},
                {name: "Formal at Delta Chapter", count: 6},
                {name: "Faculty Dinner", count: 10},
                {name: "Fall Initiation", count: 20},
                {name: "Expansion Trip", count: 4},
                {name: "Mall Show", count: 138},
                {name: "Kansas City Professional Group Picnic", count: 7},
                {name: "Spring Scavenger Hunt", count: 123},
                {name: "Piñata", count: 6},
                {name: "Fall Activity Fair", count: 11},
                {name: "Birthday Halloween", count: 53},
                {name: "Spring Initiation", count: 21},
                {name: "Open House", count: 117},
                {name: "Spring Pledging", count: 56},
                {name: "Composite Pictures", count: 43},
                {name: "Glen's Harem", count: 7},
                {name: "Professional Induction Ceremony", count: 7},
                {name: "Fall Formal Pledging", count: 6},
                {name: "Central District Conclave", count: 44},
                {name: "Fall Pledge Week", count: 13}]),
            initializeSubAlbums("2012", baseSrc, undefined, [
                {name: "Secret Santa", count: 25},
                {name: "Spring and Fall Initiations", count: 9},
                {name: "Birthday and Halloween", count: 14},
                {name: "Fall Pledge Week", count: 13},
                {name: "Putt Putt", count: 9},
                {name: "Professional Branch Induction", count: 36},
                {name: "Open House", count: 107},
                {name: "Mall Show", count: 97},
                {name: "Faculty Dinner", count: 7},
                {name: "Cosmosphere", count: 20},
                {name: "April 14th Show", count: 54},
                {name: "Periodic Table", count: 25}]),
            initializeSubAlbums("2011", baseSrc, undefined, [
                {name: "Birthday Halloween", count: 18},
                {name: "Fall and Spring Initiations", count: 7},
                {name: "Spring Potluck", count: 2},
                {name: "Mall Show", count: 5},
                {name: "Photo Scavengar Hunt", count: 17}]),
            initializeSubAlbums("2010", baseSrc, undefined, [
                {name: "Birthday Halloween", count: 36},
                {name: "Fall Pledging", count: 16},
                {name: "Conclave", count: 33},
                {name: "Open House", count: 68},
                {name: "Misc", count: 15}]),
            initializeSubAlbums("2009", baseSrc, undefined, [
                {name: "Birthday Halloween", count: 288},
                {name: "Fall Rush Week", count: 194},
                {name: "Girl Scout Day", count: 23},
                {name: "Open House", count: 359},
                {name: "Demo Club", count: 11}]),
            initializeSubAlbums("2008", baseSrc, undefined, [
                {name: "Exploding Jayhawk", count: 49},
                {name: "Charlie Brown", count: 59},
                {name: "Bowling", count: 13},
                {name: "Boy Scout", count: 13},
                {name: "Open House", count: 29},
                {name: "Random", count: 38}]),
            initializeSubAlbums("2007", baseSrc, undefined, [
                {name: "Marlatt Show", count: 11},
                {name: "Photo Scavenger Hunt", count: 3},
                {name: "Mini Golf", count: 18},
                {name: "Shows", count: 6}]),
            initializeSubAlbums("2006", baseSrc, undefined, [
                {name: "Haunted Hunt", count: 49},
                {name: "Boy Scout Day", count: 39},
                {name: "Bowling", count: 11},
                {name: "Misc", count: 4},
                {name: "Shows", count: 15}]),
            initializeSubAlbums("2005", baseSrc, undefined, [{name: "Misc", count: 3} ]));
        var setAlbumPaths = function setAlbumPaths(album, path){
            album.path = path + (album.name ? "/" + album.name : "");
            for (var i = 0; i < album.albumList.length; ++i){
                setAlbumPaths(album.albumList[i], album.path);
                album.albumList[i].x.parent = album;
            }
        }
        setAlbumPaths(viewModel, "#/pictures");
    })();
    (function initializeFaq(){
        /* Initialize Faq */var a=function(question,answer){return new Faq(question,answer);};viewModel.faqList.push(a('Aren\'t fraternities just for men?','Although most fraternities for women call themselves sororities, fraternity is the more general term for a greek letter organization. We are a fraternity in the true sense of the word. All members are referred to as brothers, including our female members.'),a('What is a professional faternity?','A professional fraternity selects its members based on common professional goals and interests. The more common social fraternities choose their members based on similar social interests. However, professional fraternities can have just as much fun as social ones, just ask any one of our members.'),a('What is pledging?','You can join some organizations simply by filling out a form and mailing in your dues. Joining a fraternity is more work. Pledging is a process where a potential member associates with our fraternity for several months before becoming a brother. This gives both you and us a chance to get to know each other before we mutually agree that our fraternity is a good fit for you.'),a('Does AΧΣ Haze?','Absolutely not. As a professional fraternity, we have a zero-tolerance policy on hazing. Pledges who are uncomfortable with what is asked of them by a member of the fraternity should voice their concerns and, if necessary, report the matter to one of the fraternity officers.'),a('Is pledging fun?','We certainly hope so. If you don\'t enjoy pledging, you won\'t enjoy being a member either. If, unfortunately, you view coming to fraternity meetings and events a hassle rather than a time for fun, perhaps you might reconsider joining our fraternity.'),a('How much of a time commitment is pledging?','Expect to spend a minimum of three or four hours per week with your potential brothers and fellow pledges. We have mandatory pledge meetings once a week and recommended activities on some weekends. The time commitment is more than that to join most clubs, but much less than that to join a social fraternity. We will not wake you up at 5am to do push ups! The time commitment for pledging is meant to be the same as for a minimally active member. If you don\'t have time to pledge, you wont have time to be a member. All that being said, many pledges find themselves voluntarily spending more time with Alpha Chi Sigma than required. It\'s fun you\'ll see!'),a('What will I do as a pledge?','As a pledge you will have a \'big,\' an active member to act as mentor and help you through the pledging process. You\'ll have to learn a little about the fraternities history and alchemy (yes, you will be quizzed). Mostly though, you will be having fun and learning what brotherhood is all about. Pledge events include bowling, a potluck, trivia night, AΧΣ Jeopardy, and many more!'),a('Can I be a member of another fraternity or sorority if I join AΧΣ?','Since we are the only chemistry fraternity on campus, the answer is yes. In fact, several of our brothers are also in social fraternities and sororities.'),a('Is AΧΣ only at K-State?','No! There are about 50 chapters of AΧΣ all across the United States. Here\'s a <a href=\'http://www.alphachisigma.org\'>link</a> to the national web-site, and here\'s a <a href=\'http://www.alphachisigma.org/page.aspx?pid=262\'>link</a> to a list of our chapters.'),a('I\'m a grad student. Why would I want to associate with undergrads?','Well, first of all, we are not only undergrads. Many of our active members are graduate students. In fact, many professors are also AΧΣ brothers. Since we are a professional fraternity, we also have an active presence in industry and a number of professional chapters. AΧΣ is not just for undergrads, it\'s for life.'));/* End Initialize Faq */
    })();
    // Application routing
    window.app = $.sammy(function() {
        this.get("#/", function() { viewModel.page(''); });
        this.get(/\#\/(.*)\/$/, function() {
            this.redirect(window.location.hash.substr(0, window.location.hash.length - 1));
        });
        this.get("#/about", function() { viewModel.page('about/axs'); });
        this.get("#/members", function() { viewModel.page('members/classes'); });
        this.get("#/professional", function() { viewModel.page('professional/mall'); });
        //#/pictures
        var getAlbum = function(name){
            for (var i = 0; i < this.albumList.length; ++i){
                if (this.albumList[i].name === name){
                    return this.albumList[i];
                }
            }
            return this;
        };
        var navigateAlbum = function(path, item, itemType){
            var ptr = viewModel;
            for (var i = 0; path && i < path.length; ++i){
                if (path[i].length){
                    ptr = getAlbum.call(ptr, path[i]);
                }
            }
            viewModel.x.currentAlbum(ptr);
            viewModel.x.currentAlbumItem(item);
            viewModel.x.currentAlbumItemType(itemType);
        };
        var setPath = function(){viewModel.page(window.location.hash.substr(2, window.location.hash.length - 2));};
        this.get("#/pictures", function() {
            navigateAlbum();
            setPath();
        });
        this.get(/\#\/pictures\/(.*)\.:type$/, function() {
            var path = this.params.splat[0].split("/");
            var type = this.params.type;
            navigateAlbum(path.slice(0, path.length - 1), path[path.length - 1], type);
            console.log(type + ": " + path[path.length - 1]);
            setPath();
        });
        this.get(/\#\/pictures\/(.*)$/, function() {
            // viewModel.x.currentAlbum(viewModel.getAlbum(this.params.albumName));
            var path = this.params.splat[0].split("/");
            navigateAlbum(path);
            setPath();
        });
        this.get(/\#\/(.*)$/, setPath);
    });
    $(function(){
        app.run("#/");
        ko.applyBindings(viewModel);
    });
})(jQuery, ko);







