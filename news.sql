-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Erstellungszeit: 09. Dez 2022 um 07:55
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
-- Tabellenstruktur für Tabelle `news`
--

CREATE TABLE `news` (
  `news` mediumtext NOT NULL,
  `news1` mediumtext NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `news`
--

INSERT INTO `news` (`news`, `news1`) VALUES
('Do.03.04.14 <font color="#0000ff"><a href="http://www.123galaxy.ch">Galaxy Space Night</a></font><br>6h live mixes,brand new stuff, me and many more on Radio <font color="#0000ff"><a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night">LoRa</a></font>!', 'Sendung verpasst? Hör<font color="#0000ff"><a href="https://soundcloud.com/jessejay/000015-gsn"> hier </a></font>die aktuellste Sendung, zum Archiv und Webradio gehts <font color="#0000ff"><a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night">da lang</a></font>...'),
('Do.16.10.14 <font color="#0000ff"><a href="http://www.123galaxy.ch">Galaxy Space Night</a></font><br>6h live mixes,brand new stuff, me and many more on Radio <font color="#0000ff"><a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night">LoRa</a></font>!', 'Sendung verpasst? Hör<font color="#0000ff"><a href="https://soundcloud.com/jessejay/000015-gsn"> hier </a></font>die aktuellste Sendung, zum Archiv und Webradio gehts <font color="#0000ff"><a href="https://soundcloud.com/jessejay/galaxy-space-night-oktober-1">da lang</a></font>...'),
('Do.16.10.14 <font color="#0000ff"><a href="http://www.123galaxy.ch">Galaxy Space Night</a></font><br>6h live mixes,brand new stuff, me and many more on Radio <font color="#0000ff"><a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night">LoRa</a></font>!', 'Sendung verpasst? Hör<font color="#0000ff"><a href="https://soundcloud.com/jessejay/000015-gsn"> hier </a></font>die aktuellste Sendung, zum Archiv und Webradio gehts <font color="#0000ff"><a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night">da lang</a></font>...');

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `news`
--
ALTER TABLE `news` ADD FULLTEXT KEY `news` (`news`);
ALTER TABLE `news` ADD FULLTEXT KEY `news_2` (`news`);
ALTER TABLE `news` ADD FULLTEXT KEY `news_3` (`news`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;