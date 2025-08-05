-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Erstellungszeit: 09. Dez 2022 um 07:56
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
-- Tabellenstruktur für Tabelle `soundTable`
--

CREATE TABLE `soundTable` (
  `soundID` int(11) NOT NULL,
  `eventID` int(11) NOT NULL DEFAULT 0,
  `style` tinytext NOT NULL,
  `urlAbspielen` tinytext NOT NULL,
  `urlDownload` tinytext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `soundTable`
--

INSERT INTO `soundTable` (`soundID`, `eventID`, `style`, `urlAbspielen`, `urlDownload`) VALUES
(1, 10, 'josefs ruhe special', 'http://195.210.0.134:554/ramgen/lora/archiv/20030502.rm', ''),
(4, 26, 'groovy deep\'n\'progress', 'http://195.210.0.134:554/ramgen/lora/archiv/20030418.rm', ''),
(5, 27, 'Local Progressive', 'http://193.192.228.134:554/ramgen/lora/archiv/20030516.rm?start=00:00:00', ''),
(6, 28, 'progressive', 'http://195.210.0.134:554/ramgen/lora/archiv/20030530.rm', ''),
(7, 33, 'groovy deep\'n\'progress', 'http://195.210.0.134:554/lora/archiv/20030711.rm?', ''),
(8, 47, 'progressive', 'http://195.210.0.134:554/lora/archiv/20030822.rm', ''),
(9, 38, 'progressive', 'http://195.210.0.134:554/lora/archiv/20030822.rm', ''),
(10, 48, 'progressive', 'http://195.210.0.134:554/lora/archiv/20030822.rm', ''),
(11, 48, 'progressive', 'http://195.210.0.134:554/lora/archiv/20030822.rm', ''),
(12, 49, 'progressive', 'http://195.210.0.134:554/lora/archiv/20030822.rm', ''),
(13, 63, 'progressive', 'http://195.210.0.134:554/ramgen/lora/archiv/20030919.rm', ''),
(14, 65, 'progressive', 'http://195.210.0.134:554/lora/archiv/20031003.rm?', ''),
(16, 71, 'SexyProgressive', 'http://193.192.228.134:554/ramgen/lora/archiv/20031226.rm?start=00:00:00', ''),
(18, 84, 'progressive', 'http://195.210.0.134:554/ramgen/lora/archiv/20031212.rm?', ''),
(19, 87, 'JingleBeats', 'http://193.192.228.134:554/ramgen/lora/archiv/20031226.rm?start=00:00:00', ''),
(20, 97, 'progressive', 'http://195.210.0.134:554/ramgen/lora/archiv/20040109.rm?', ''),
(21, 102, 'groovy deep\'n\'progress', 'http://195.210.0.134:554/ramgen/lora/archiv/20040206.rm?', ''),
(22, 109, 'progressive', 'http://195.210.0.134:554/ramgen/lora/archiv/20040305.rm?', ''),
(24, 126, 'progressive-goa', 'http://195.210.0.134:554/ramgen/lora/archiv/20040514.rm?', ''),
(25, 128, 'Progressive-Tech House', 'http://193.192.228.134:554/ramgen/lora/archiv/20040528.rm?start=00:00:00', ''),
(26, 162, 'progressive', 'http://193.192.228.134:554/ramgen/lora/archiv/20040709.rm?start=00:00:00', ''),
(40, 821, '5min hiphop 355min electro space', 'http://193.192.228.134:554/ramgen/lora/archiv/20100715.rm?start=18:00:00', ''),
(39, 816, 'elektronisch', 'http://193.192.228.134:554/ramgen/lora/archiv/20100701.rm?start=18:00:00', ''),
(41, 826, 'Progressive-House, Tech-House', 'http://a1.soundcloud.com/images/player-overlay.png?ffb13b', ''),
(44, 992, 'Housemusic', 'https://soundcloud.com/jessejay/galaxy-space-night-indian', '');

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `soundTable`
--
ALTER TABLE `soundTable`
  ADD PRIMARY KEY (`soundID`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `soundTable`
--
ALTER TABLE `soundTable`
  MODIFY `soundID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
