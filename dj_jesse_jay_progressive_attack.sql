-- MySQL dump 10.19  Distrib 10.3.36-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: jessejay
-- ------------------------------------------------------
-- Server version	10.3.36-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;



--
--
--
-- Table structure for table `biography`
--

DROP TABLE IF EXISTS `biography`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `biography` (
  `index` smallint(6) NOT NULL AUTO_INCREMENT,
  `german` text NOT NULL,
  `english` text NOT NULL,
  PRIMARY KEY (`index`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biography`
--

LOCK TABLES `biography` WRITE;
/*!40000 ALTER TABLE `biography` DISABLE KEYS */;
INSERT INTO `biography` VALUES (1,'<font size=\"15\"><b>DJ JESSE JAY</b></font>%09%09DJ since 1997<br><br><br><br><b>Style:</b> funky-groovy-progressive beats, prog.-deep-tech and minimalhouse,\"minimal-maximalelectrotrance\"<br><br>Do you know the feeling „DJ..DJ...all your sound seems the same to me“?\r\nBeing suddenly taken into a round, remarkably awakening of passion, our party passion, soul carrying voyages, heart space creating horizons and feeling music/sexy! fantasies arise got, seldom since quite a while.\r\nThat is how Jesse loves to feel when giving himself to the music and this is how he passes on his sound and emotions to the crowd, embracing with his radical sensitiveness.\r\nJesse grew up in his contagious party senses at the individuality-reigning, going mad and „we are family“ philosophical, legendary Clubs like Aera, Labyrinth, SpiderGalaxy, Take A Dance, Hermetschloo and Dachkantine.\r\nAt Radio Lora he plays each two weeks since 15 years at Galaxy Space Nights 6 hours long, deep-tender holidays of the mind with his timeless, surprising choice of pearl-tracks, heartful and at the same time porno stories, seamlessly woben with his distinctive DJ\'s skills. He gives the same dimension of importance to play at the beginning, as a main act or the outro since 1997. A loyal Vinyl Lover, equally pleasuring with the CDJ.\r\nDo you know the feeling of an unconditional, passionate music trip, too?\r\n\r\nwww.facebook.com/DjJesseJay\r\n\r\nwww.lora.ch/sendungen/alle-send…ngen/67?list=Galaxy Space Night\r\n<br><br><b>Radio: </b><font color=\"#0000ff\"><a href=\"http://www.123galaxy.ch\" target=\"_blank\">Galaxy Space Night</a></font><br>Dieser Name steht seit über 10 Jahren für elektronische Musik auf den Lokalradiosendern Radio LoRa in Zürich, Radio Stadtfilter in Winterthur und Radio RaBe in Bern.Jeden Samstagabend auf Radio RaBe und jeden zweiten aus dem Studio in Winterthurpräsentiert euch die GSN Crew das Neuste von und aus der elektronischen Klangwelt.\r\nUnd jeden zweiten Donnerstagabend zur Geisterstunde, melde ich mich aus Zürich auf der Frequenz von Radio LoRa.\r\nGalaxy Space Night gehört gehört...','<font size=\"15\"><b>DJ JESSE JAY</b></font>%09%09dj since 1997<br><br><br><br><b>style:</b> funky-groovy-progressive beats, prog.-deep-tech and minimalhouse,\"minimal-maximalelectrotrance\"<br>\r\nDo you know the feeling „DJ..DJ...all your sound seems the same to me“?\r\nBeing suddenly taken into a round, remarkably awakening of passion, our party passion, soul carrying voyages, heart space creating horizons and feeling music/sexy! fantasies arise got, seldom since quite a while.\r\nThat is how Jesse loves to feel when giving himself to the music and this is how he passes on his sound and emotions to the crowd, embracing with his radical sensitiveness.\r\nJesse grew up in his contagious party senses at the individuality-reigning, going mad and „we are family“ philosophical, legendary Clubs like Aera, Labyrinth, SpiderGalaxy, Take A Dance, Hermetschloo and Dachkantine.\r\nAt Radio Lora he plays each two weeks since 15 years at Galaxy Space Nights 6 hours long, deep-tender holidays of the mind with his timeless, surprising choice of pearl-tracks, heartful and at the same time porno stories, seamlessly woben with his distinctive DJ\'s skills. He gives the same dimension of importance to play at the beginning, as a main act or the outro since 1997. A loyal Vinyl Lover, equally pleasuring with the CDJ.\r\nDo you know the feeling of an unconditional, passionate music trip, too?\r\n\r\nwww.facebook.com/DjJesseJay\r\n\r\nwww.lora.ch/sendungen/alle-send…ngen/67?list=Galaxy Space Night\r\nGalaxy Space Night\r\nIn the year 2000, after a friend from work  intraduced me to Galaxy Space Night, a radio show for Electronic Music at Radio RaBe (Bern) I deceided to actively work on the show. Since then I am a resident at the Show and have been able to collect my experiences and impressions in the radioworld.<br>Since October 2001 I host the show at radio LoRa (Zurich) every second Thursday from midnight to 6 a.m..<br><br>Listen to Galaxy Space Night! on 97,5 MHz or live on web <font color=\"#ff0000\"><a href=\"http://www.123galaxy.ch\" target=\"_blank\">http://www.123galaxy.ch</a></font>\r\n');
/*!40000 ALTER TABLE `biography` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evenTable`
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
-- Dumping data for table `evenTable`
--

LOCK TABLES `evenTable` WRITE;
/*!40000 ALTER TABLE `evenTable` DISABLE KEYS */;
INSERT INTO `evenTable` VALUES (362,'2006-07-22','Sternennacht Krebs @ Klub Ex (selve-areal thun)<br>with D.J.N.D. and Jesse Jay','www.klub-ex.ch',''),(367,'2006-08-05','Attic -Afterhour<br>with 5th Element, Sonic, Jesse Jay','www.attic-club.ch',''),(368,'2005-08-05','ElectroKeller  (SG)<br>with D.J.N.D. and Jesse Jay','www.technobar25.ch',''),(365,'2006-07-02','Bananabar','www.bananabar.ch',''),(364,'2006-07-01','Shake with Mental X @ Radio Virus','www.virus.ch/sendungen/shake/(offset)/3',''),(363,'2006-07-02','Attic<br>with 5th Element, Jesse Jay, Roby Icks, and Chris the Rebell','www.attic-club.ch',''),(361,'2006-06-21','Treffpunkt by Norman','www.g-colors.ch/aaah/eventdetail.html?event_id=760',''),(17,'2003-02-28','greenspace and smoked night','',''),(18,'0000-00-00','me myself and i','','');
/*!40000 ALTER TABLE `evenTable` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;