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
  `news1` mediumtext NOT NULL,
  FULLTEXT KEY `news_fulltext` (`news`),
  FULLTEXT KEY `news1_fulltext` (`news1`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `news`
--

INSERT INTO `news` (`news`, `news1`) VALUES
('Do.03.04.14 <a href="http://www.123galaxy.ch" target="_blank" rel="noopener">Galaxy Space Night</a><br>6h live mixes,brand new stuff, me and many more on Radio <a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night" target="_blank" rel="noopener">LoRa</a>!', 'Sendung verpasst? Hör <a href="https://soundcloud.com/jessejay/000015-gsn" target="_blank" rel="noopener">hier</a> die aktuellste Sendung, zum Archiv und Webradio gehts <a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night" target="_blank" rel="noopener">da lang</a>...'),
('Do.16.10.14 <a href="http://www.123galaxy.ch" target="_blank" rel="noopener">Galaxy Space Night</a><br>6h live mixes,brand new stuff, me and many more on Radio <a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night" target="_blank" rel="noopener">LoRa</a>!', 'Sendung verpasst? Hör <a href="https://soundcloud.com/jessejay/000015-gsn" target="_blank" rel="noopener">hier</a> die aktuellste Sendung, zum Archiv und Webradio gehts <a href="https://soundcloud.com/jessejay/galaxy-space-night-oktober-1" target="_blank" rel="noopener">da lang</a>...'),
('Do.16.10.14 <a href="http://www.123galaxy.ch" target="_blank" rel="noopener">Galaxy Space Night</a><br>6h live mixes,brand new stuff, me and many more on Radio <a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night" target="_blank" rel="noopener">LoRa</a>!', 'Sendung verpasst? Hör <a href="https://soundcloud.com/jessejay/000015-gsn" target="_blank" rel="noopener">hier</a> die aktuellste Sendung, zum Archiv und Webradio gehts <a href="http://www.lora.ch/sendungen/alle-sendungen/67?list=Galaxy+Space+Night" target="_blank" rel="noopener">da lang</a>...');

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `news`
-- (FULLTEXT indexes are now defined in the CREATE TABLE statement)
--
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;