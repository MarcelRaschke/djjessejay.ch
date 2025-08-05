-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Erstellungszeit: 09. Dez 2022 um 07:54
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
-- Tabellenstruktur für Tabelle `links`
--

CREATE TABLE `links` (
  `index` tinyint(4) NOT NULL,
  `links` mediumtext NOT NULL,
  `url` tinytext NOT NULL,
  `info` mediumtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `links`
--

INSERT INTO `links` (`index`, `links`, `url`, `info`) VALUES
(2, 'Galaxy Space Night', 'www.123galaxy.ch', 'züri/bern techno sendungen weltweit über internet'),
(3, 'Marcin Kolonko - webdesign', 'www.kolonko.ch', 'diese homepage wurde von ihm ins netz gestellt'),
(4, 'Labyrinth', 'www.laby.ch', 'Der Nr.1 Gayclub in Zürich (R.I.P.)'),
(29, 'Soundcloud', 'soundcloud.com/jessejay', 'mein soundcloud profil'),
(9, 'Putzfrauenagentur', 'www.putzfrauenagentur.ch', 'raumpflege ist vertrauenssache'),
(30, 'DJ Jesse Jay', 'www.facebook.com/pages/DJ-Jesse-Jay/99520703334', ' "gefällt mir"'),
(25, 'Mental X - Shake on Radio Virus', 'www.mentalx.virus.ch', 'wöchentliche Informations - Inspirations-  Motivationsquelle'),
(26, 'Facebook', 'www.facebook.com/DjJesseJay', '"Freunde"');

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `links`
--
ALTER TABLE `links`
  ADD PRIMARY KEY (`index`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `links`
--
ALTER TABLE `links`
  MODIFY `index` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;