-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Erstellungszeit: 09. Dez 2022 um 07:57
-- Server-Version: 10.3.36-MariaDB
-- PHP-Version: 7.4.32

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `jessejay`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `guestbook`
--

CREATE TABLE `guestbook` (
  `idnum` int(11) NOT NULL,
  `whenposted` int(11) DEFAULT NULL,
  `name` text DEFAULT NULL,
  `email` text DEFAULT NULL,
  `www` text DEFAULT NULL,
  `comments` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `guestbook`
--

INSERT INTO `guestbook` (`idnum`, `whenposted`, `name`, `email`, `www`, `comments`) VALUES
(277, 1348181566, 'Eine Gruppe von Fans', '', 'http://', 'Schöner Jesse\r\n\r\nDein Sound ist jedesmal eine wahnsinnig tiefe Gefühlsreise, die selten ein DJ hin kriegt. \r\nDu bist in den Emotionen, die Du vermittelst und makellos spielst unverkennbar und einzigartig. \r\n\r\nDanke, dass es Dich gibt, Jesse Jay. Danke für Deine Musik.\r\nWe all love you. (und es eine grosse Gruppe, die Dich sonst still verehrt :-) '),
(270, 1344544674, 'michi k.', '', 'http://', 'ciao jesse. jetzt war ich das erste mal auf deiner homepage :-)) lieben gruss m.'),
(269, 1343933832, 'Beni', 'our.beats@gmx.ch', 'http://a2.ec-images.myspacecdn.com/images02/141/8d282c55c9e54af29c2e00cfb936bf2c/l.jpg', 'Hallo Michi! Danke für deinen GB-Eintrag auf unserer Page! Deine Page ist ebenfalls sehr interessant und hat ein hammer Design, Respect! Wünsche dir eine Gute Zeit und weiterhin viel Erfolg... Let the beat goes on Beats and Greetz Beni'),
(163, 1300391047, 'DancingQueen', '', 'http://', 'Grosser Jesse, nach mehr als 10 Jahren kann wohl sagen, dass Du eine IKONE bist. \r\n\r\nDein Stil, Dein Feeling, Deine Leidenschaft, die Macht DEIN Publikum mitzureissen, zu verzaubern, zu Highs empor zu heben, ist eine seltene Kunst, eine unglaubliche Gabe, ein grosses Talent und eine totale Hingabe Deinerseits. \r\n\r\nDafür, dass Du uns seit sooo langem schon vom Feinsten verwöhnst, dass Du ein derart schöner Mensch bist und dass Du Dir und uns treu bleibst mit Deiner Passion, danke ich Dir von Herzen. \r\n\r\nZürich ist die beste Stadt der Welt, auch weil es DJs wie Dich hat! \r\n\r\nHerzlichste Gratulation Jesse. \r\n\r\nMich auf mehr freuend, umarme ich Dich, Deine, Dancing Queen'),
(157, 1286679539, 'Mathias', '', 'Dejavu', 'hey jessejay! vielen dank nochmals für die 2 demo-cd`s welche du mir geschenkt hast letzten freitagmorgen! dein set war oberhammergeil im thaithai. ich bin definitiv von deinem sound & können begeistert oder wie du sagst infiziert! du hast den groove echt drauf und die musik kommt von \"innen\". eine pandemie wäre in deinem fall sehr wünschenswert... weiter so und hoffentlich bis bald. Mathias\r\n'),
(156, 1283706183, 'stefan', 'stefanzollinger@hotmail.com', 'http://', 'hoooi Michi,\r\nhan mich namal welle bi dir und bide anderne bedanke für de lässig abig gestert, mal was anders gsi+ han mi gfreut uf die nett bekannschaft mit eu allne.\r\n\r\nhoffe mi köhrt oder gseht sich wieder mal bald, ich weis ja woni eu /dich finde chan.\r\n\r\ncheers stefan'),
(155, 1280177478, 'jayjay', 'jay.rickli@bluewin.ch', 'http://', 'ja hammer ... hallo michi  du warst fleissig am webside auf pimpen...cool !!!!  \r\nso freue ich mich auf samstag  im CELESTIAL  wo DU die leute rockst...jepaaaaaaaaaaa\r\nen schmatzer jj '),
(152, 1279128288, 'Annemarie  ( !! )', 'lady-julia@lady-julia.com', 'http://www.latex-deluxe.com', 'Hi Michl,\r\n\r\nFür die Lora-Galaxy-Space-Sommerpause hast Du endlich mal wieder Zeit für Deine *Hausaufgaben* Das heisst fleissig CDs für uns mixen ** freu **  \r\n\r\nPlus mehr Zeit für uns wieder :-) \r\n\r\nFreu mich auf Dich, werde aber trotzdem die heimelige couch im Lora ein wenig vermissen.\r\n\r\nKiss vom Annerl\r\n\r\n@Ken-Zoo , treue \"Fans\" sind live dabei und *wohnen* nicht in Gästebüchern *zwinker* \r\n\r\n'),
(151, 1274540055, 'DJ Ken-ZOO', 'jaeseoul@hotmail.com', 'http://www.gayromeo.com/GALAXY', 'hey Michi,\r\nwas ist los mit Dir, dass niemand mehr in Dein GB schreibt? Bin ich wirklich Dein letzter treuer Fan?\r\n\r\nWünsche Dir alles Gute.\r\n\r\nhiro\r\n\r\nP.S.schreib mir doch mal eine e-mail. würde mich riesig freuen.'),
(150, 1265326553, 'DJ Various Artists', 'habore@hispeed.ch', 'http://myspace.com/yahushii', 'Lieber DJJJ,\r\nich habe einen neuen Electronicastil entwickelt. Ab sofort heisst TranceInTheFire™ Trancesty™, auf Deutsch: vollgedonnert auf den Floor. Kennst Du doch, oder nicht, oder wohl doch? \r\nGrusss\r\nDJVA\r\n'),
(149, 1263368065, '', '', 'http://', ''),
(148, 1260188033, 'david', 'begoodbebadjustbe@hotmail.com', 'http://', 'huhuhuhuhuhu\r\nnochmals vielen dank für deine cd\r\nwar genau das richtige zum noch ein wenig zuhause zu chillen und die nacht ausklingen zu lassen\r\nthanksthanksthanks und bis bald\r\nbumdibum'),
(147, 1257498965, 'Marc Hodel', 'marc_hodel@gmx.net', 'http://', 'Hoi Michi\r\nWie gahts dir denn so? han scho ewigs nüt meh vo dir ghört...also besser gseit ich han mich scho ewigs nümme bi dir gmolde. Wie ich gsehne bisch du immer na sehr aktiv was DJ\'ing abelangt...fini hammer. Wohne etz au wieder in ZH...würd mich übere antwort freue. Peace'),
(146, 1251236280, 'DJ Ken-ZOO aka exhiro', 'habore@hispeed.ch', 'http://www.myspace.com/yahushii', 'lieber Michael, lieber Dream,\r\n\r\nich habe in den letzten 12 jahren immer wieder mit wehmut and Euch und Eure elysischen Klänge im Oxaaah gedacht.\r\njetzt möchte ich mich einmal mit Euch bei einer tasse kaffee über mein riesenprojekt an neujahr unterhalten. es soll alles bisher dagewesene (ex you) in den schatten stellen und den pseudo-progressive-labyanern klar machen, dass Trance nie sterben wird. GIGA-EVENT ENGINE1 is powered by star-newcomer-DJ Ken-ZOO. location: Zurich-City.  start: january 1st 2010, 00:30  style: Trance In The Fire. line up: Ken-ZOO & friends\r\nkuss\r\nHans-Jörg\r\n\r\nP.S. für DJJJ: Dreams könnte exakt meine sein (http://www.djdream.ch/3/index.html) '),
(145, 1247372198, 'hiro', 'habore@hispeed.ch', 'http://www.myspace.com/yahushii', 'verehrter Michi,\r\nmuss wieder mal etwas in dein gb setzen, sonst wird es mir langweilig. ein blick in meine hp lohnt sich. es hat sich einiges verändert. allem voran hat sich die crème de la crème der eurotrance-DJ\'s in meinem sorgfältig ausgewählten, kleinen freundeskreis versammelt.\r\ndas projekt TRANZ fällt wohl ins wasser. die behörden wissen eben nicht, was sie da verpassen.\r\nmach\'s gut und herzliche grüsse an Michael K. und Zed. und wenn dir Luca über den weg läuft, kannst du ihm einen einfachen kuss von mir geben.\r\n\r\nhiro'),
(144, 1242857218, 'Ricardo Sobral ', 'rickitbr@hotmail.com', 'http://', 'Lieber Michi wie geht es dir? Hoffe gut...\r\nich habe immer mit dir geträumt!\r\nmir geht es hier gut und bald komm ich zurück nach europa.\r\nfür eine neue Tour ohne Zeit und Destination, Ziel. Es würde mich freuen zu wissen ob die POstkarte bei dir angekommen ist, die ich dir geschickt habe.\r\nmeine telefonnummer in brasilien ist(005561-3347-30-63) es sind 5 stunden weniger\r\nzur schweiz.\r\nEinen grossen Kuss für dein Herz und tausend küsse ricardo !!\r\n\r\n\r\n'),
(143, 1240224546, 'mirta', 'mirta.b.modric@swisscard.ch', 'http://', 'hallo michi ! dein set vom samstag im laby war 1. klasse danke für die angaben für radio und deine web seite. liebe grüsse, mirta'),
(142, 1237439255, 'hiro', 'habore@hispeed.ch', 'http://www.myspace.com/yahushii', 'ciao Michi,\r\n\r\nwollte Dir nur mal guten tag sagen.\r\nim folgenden siehst du meinen eintag in gayromeo (APOCALYPSE-NOW):\r\n\r\nhighly recommended 4 trancing ravers:\r\n\r\nlive streaming:\r\nwww.ah.fm\r\nwww.trance.fm\r\nwww.1.fm\r\n\r\nfavourite DJ-line-up:\r\nDJ Michael K., Zürich\r\nDJ Jesse Jay, Zürich (www.jessejay.ch)\r\nDJ afternoon, Bern\r\nDJ Ken-ZOO, Basel (myself)\r\nDJ Noise, Zürich\r\n\r\nworld number 1 event:\r\nstreetparade 2009 (http://www.streetparade.ch/)\r\n '),
(141, 1237438879, 'hiro', '', 'http://', ''),
(140, 1235727447, 'grille', 'janosch-3@hotmail.com', 'http://', 'so michi han grad dis gästebuech duregacheret .. das staht ja nüt aktuells dinne.. usert de doooofi hiro, was isch das für en psycho??..egal..\r\nchamer nöd mal party eifach gnüsse und din geile sound ihneziehe?!?!?! mir findet din sound eifach innnovativ,frreeech, friiiisch.. und so oder so de michi bringts :D danke vielmal für die schöni zit mit dir und uf weiteri geili partys kiz'),
(139, 1231485431, 'hiro aka DJVA aka Ken-ZOO', 'habore@hispeed.ch', 'http://www.myspace.com/yahushii', 'hallo Michi,\r\n\r\nich hoffe, Du bist gut im neuen jahr gelandet. ich habe post für Dich @ aaah! geschickt. sie sollte heute eintreffen.\r\n\r\nübrigens:\r\nam 31. dezember 2009 eröffne ich in zürich die disco TRANZ. was das wohl wird? Ken-ZOO vs. Luca?\r\n\r\nherzliche grüsse\r\n\r\nhiro\r\n'),
(138, 1228759594, 'hiro', 'habore@hispeed.ch', 'http://www.trance.fm/?gclid=CK3694HL-pUCFRF5bgod5DF_Fg', 'hi Michi,\r\n\r\nagain old e-mail-adress\r\n\r\nkind regards\r\n\r\nhiro'),
(137, 1224355084, 'hiro', 'TranceFM@hispeed.ch', 'http://www.trance.fm/?gclid=CK3694HL-pUCFRF5bgod5DF_Fg', 'new e-mail-adress and hp\r\n\r\nregards\r\n\r\nhiro'),
(136, 1222481704, 'hiro', 'habore@hispeed.ch', 'http://www.myspace.com/yahushii', 'ob du es glaubst oder nicht, es gibt mich immer noch in alter frische.\r\n\r\nvielleicht treffen wir uns am hexenball im lotus. wäre sehr nett, dich wieder mal zu sehen.\r\n\r\ngruss\r\n\r\nhiro'),
(135, 1222430590, 'sandra', 'crazy_@freesurf.ch', 'http://', 'hi min lieblings dj,wenn Du ufleisch isches eifach immer vollgeil!partygarantie-aber wo sind dänn dini\"wännwouflegdate\"?das wär schön zwüsse!in soundlove san');

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `guestbook`
--
ALTER TABLE `guestbook`
  ADD PRIMARY KEY (`idnum`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `guestbook`
--
ALTER TABLE `guestbook`
  MODIFY `idnum` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=280;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
