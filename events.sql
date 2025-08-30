-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Erstellungszeit: 30. Aug 2025 um 11:30
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
-- Tabellenstruktur für Tabelle `evenTable`
--

DROP TABLE IF EXISTS `evenTable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `evenTable` (
  `eventID` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL DEFAULT '0000-00-00',
  `event` tinytext NOT NULL,
  `eventURL` tinytext NOT NULL,
  `lineup` mediumtext NOT NULL,
  PRIMARY KEY (`eventID`)
) ENGINE=MyISAM AUTO_INCREMENT=1044 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Daten für Tabelle `evenTable`
--

LOCK TABLES `evenTable` WRITE;
/*!40000 ALTER TABLE `evenTable` DISABLE KEYS */;
INSERT INTO `evenTable` VALUES (362,'2006-07-22','Sternennacht Krebs @ Klub Ex (selve-areal thun)<br>with D.J.N.D. and Jesse Jay','www.klub-ex.ch',''),(367,'2006-08-05','Attic -Afterhour<br>with 5th Element, Sonic, Jesse Jay','www.attic-club.ch',''),(368,'2005-08-05','ElectroKeller  (SG)<br>with D.J.N.D. and Jesse Jay','www.technobar25.ch',''),(365,'2006-07-02','Bananabar','www.bananabar.ch',''),(364,'2006-07-01','Shake with Mental X @ Radio Virus','www.virus.ch/sendungen/shake/(offset)/3',''),(363,'2006-07-02','Attic<br>with 5th Element, Jesse Jay, Roby Icks, and Chris the Rebell','www.attic-club.ch',''),(361,'2006-06-21','Treffpunkt by Norman','www.g-colors.ch/aaah/eventdetail.html?event_id=760',''),(17,'2003-02-28','greenspace and smoked night','',''),(18,'0000-00-00','me myself and i','',''),(360,'2006-06-24','Dreamdance Bar<br>with Lèon and me','www.dreamdancebar.ch',''),(359,'2006-07-21','Laby Loft: Deko Party<br>with Thomi B. and me','www.laby.ch/event_detail.html?event_ID=1039',''),(27,'2003-05-16','Local Underground on Air!','www.localunderground.ch','Jesse Jay, Tino Boss, Frisk, Manic'),(349,'2006-08-22','Tuesdaylounge @ Club Aaah!','www.aaah.ch',''),(350,'2006-07-08','Labyrinth<br>with Mental X, Martin, Jesse Jay<br>my playtime: round n round all night long!','www.laby.ch/event_detail.html?event_ID=1036',''),(351,'2006-07-23','After Eight @ Labyrinth<br>with Steven S. and me','www.laby.ch/event_detail.html?event_ID=1050',''),(352,'2006-08-11','Laby Loft: Gay Party<br>with Thomi B. and me','www.laby.ch/event_detail.html?event_ID=1046',''),(353,'2006-08-12','STREETPARADE! Labyrinth am Hirschenplatz','www.laby.ch',''),(528,'2007-09-09','X-Treme @ Club Aaah!<br>Cheap and Chic','www.aaah.ch',''),(357,'2006-06-18','After Eight @ Labyrinth<br>with Cherie and me...!!','www.laby.ch/event_detail.html?event_ID=1028',''),(356,'2006-08-16','Treffpunkt by Norman','www.aaah.ch',''),(355,'2006-07-12','Treffpunkt by Norman!<br>my playtime: 22:30-04:00','www.aaah.ch',''),(354,'2006-05-14','Cheap and Chic @ Club Aaah!','www.aaah.ch',''),(346,'2006-08-08','Tuesdaylounge @ Club Aaah!','www.aaah.ch',''),(347,'2006-08-13','Cheap and Chic @ Club Aaah!','www.aaah.ch',''),(348,'2006-08-20','Cheap and Chic @ Club Aaah!','www.aaah.ch',''),(345,'2006-07-25','Tuesdaylounge @ Club Aaah!!<br>my playtime: 23:00-04:00','www.aaah.ch',''),(344,'2006-07-16','Cheap and Chic @ Club Aaah!!<br>my playtime: 23:00-04:00','www.aaah.ch',''),(343,'2006-07-02','Cheap and Chic @ Club Aaah!!<br>my playtime: 23:00-04:00','www.aaah.ch',''),(342,'2006-07-11','Tuesdaylounge @ Club Aaah!!<br>my playtime: 23:00-04:00','www.aaah.ch',''),(341,'2006-06-11','Banana Bar<br>with Christina Souvenir, Nader, Cherie and me','www.bananabar.ch',''),(340,'2006-01-12','Galaxy Space Night @ Radio Lora 97,5Mhz','http://195.210.0.134:554/lora/archiv/20060113.rm?start','Knox, Girl, Jesse Jay'),(339,'2006-05-20','Rhythm in Progress @ Dreamdancebar<br>playtime: 22:00-open end','www.dreamdancebar.ch',''),(526,'2007-08-26','X-Treme @ Club Aaah!','www.aaah.ch',''),(527,'2007-09-04','One Way @ Club Aaah!','www.aaah.ch',''),(338,'2006-07-13','Galaxy Space Night @ Radio Lora 97,5Mhz','www.123galaxy.ch',''),(68,'2003-10-17','galaxy space night @ radio lora 97.5fm \\','www.123galaxy.ch','Jesse Jay 00:00-01:00, Steve Foster 01:00-03:00, Feivel  03:00-05:00, Jesse Jay 05:00-06:00'),(525,'2007-09-15','TAKE A DANCE @ Loop38<br>harmony, balance and rhythm with Cherie, Alphajet and Jesse Jay<br>contact me 4 guestlist!','www.loop38.ch','');
/*!40000 ALTER TABLE `evenTable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `evenTable`
--
ALTER TABLE `evenTable`
  ADD PRIMARY KEY (`eventID`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `evenTable`
--
ALTER TABLE `evenTable`
  MODIFY `eventID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1044;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;