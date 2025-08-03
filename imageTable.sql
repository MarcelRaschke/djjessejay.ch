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
-- Tabellenstruktur für Tabelle `imageTable`
--

CREATE TABLE `imageTable` (
  `imgID` int(11) NOT NULL,
  `eventID` int(11) NOT NULL DEFAULT 0,
  `imgName` tinytext NOT NULL,
  `imgWidth` smallint(6) NOT NULL DEFAULT 0,
  `imgHeight` smallint(6) NOT NULL DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `imageTable`
--

INSERT INTO `imageTable` (`imgID`, `eventID`, `imgName`, `imgWidth`, `imgHeight`) VALUES
(1, 15, '_2003-03-28_klubex/DSC02839.jpg', 349, 466),
(2, 15, '_2003-03-28_klubex/DSC02864.jpg', 466, 349),
(3, 15, '_2003-03-28_klubex/Feivel-grins-.jpg', 349, 466),
(4, 15, '_2003-03-28_klubex/Irma.jpg', 349, 466),
(5, 15, '_2003-03-28_klubex/Irma_Michi_dance.jpg', 349, 466),
(6, 15, '_2003-03-28_klubex/Jesse_Feivel@work.jpg', 349, 466),
(7, 15, '_2003-03-28_klubex/Maggie_Irma.jpg', 466, 349),
(8, 15, '_2003-03-28_klubex/Maggie_Irma2.jpg', 349, 466),
(9, 15, '_2003-03-28_klubex/backside-feivel,jesse,manic.jpg', 466, 349),
(10, 15, '_2003-03-28_klubex/bettina_remy.jpg', 466, 349),
(11, 15, '_2003-03-28_klubex/ex-thun.jpg', 466, 349),
(12, 15, '_2003-03-28_klubex/feive@work.jpg', 349, 466),
(13, 15, '_2003-03-28_klubex/jesse@work.jpg', 466, 349),
(14, 15, '_2003-03-28_klubex/jessejay.jpg', 466, 349),
(15, 15, '_2003-03-28_klubex/maggie_felix.jpg', 466, 349),
(16, 15, '_2003-03-28_klubex/michi,maggie_irma.jpg', 466, 349),
(17, 15, '_2003-03-28_klubex/pati_irma.jpg', 466, 349),
(18, 15, '_2003-03-28_klubex/remy@work.jpg', 349, 466),
(19, 15, '_2003-03-28_klubex/billard_pati.jpg', 466, 349),
(51, 17, '2003-02-03_smoked_night/14_scheiss-macho_im_zoo.jpg', 466, 350),
(49, 17, '2003-02-03_smoked_night/12_hippie_im_zoo.jpg', 349, 466),
(50, 17, '2003-02-03_smoked_night/13_lili.jpg', 466, 350),
(48, 17, '2003-02-03_smoked_night/11_barman_im_zoo.jpg', 466, 350),
(47, 17, '2003-02-03_smoked_night/10_martin_im_zoo.jpg', 466, 350),
(46, 17, '2003-02-03_smoked_night/09_nadine_und_freundin_von_martin.jpg', 466, 350);

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `imageTable`
--
ALTER TABLE `imageTable`
  ADD PRIMARY KEY (`imgID`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `imageTable`
--
ALTER TABLE `imageTable`
  MODIFY `imgID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
