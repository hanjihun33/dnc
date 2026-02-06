-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: dnc_db
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `food_analyses`
--

DROP TABLE IF EXISTS `food_analyses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `food_analyses` (
  `analysis_id` bigint NOT NULL AUTO_INCREMENT,
  `food_id` bigint NOT NULL,
  `food_code` bigint DEFAULT NULL,
  `estimated_weight` float DEFAULT NULL,
  `ai_confidence` float DEFAULT NULL,
  `ai_comment` text,
  `model_name` varchar(50) DEFAULT NULL,
  `model_version` varchar(50) DEFAULT NULL,
  `analyzed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `raw_result_json` json DEFAULT NULL,
  PRIMARY KEY (`analysis_id`),
  KEY `idx_food_analyses_food` (`food_id`),
  KEY `fk_food_analyses_metadata` (`food_code`),
  CONSTRAINT `fk_food_analyses_food` FOREIGN KEY (`food_id`) REFERENCES `food_records` (`food_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_food_analyses_metadata` FOREIGN KEY (`food_code`) REFERENCES `food_metadata` (`food_code`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `food_analyses`
--

LOCK TABLES `food_analyses` WRITE;
/*!40000 ALTER TABLE `food_analyses` DISABLE KEYS */;
INSERT INTO `food_analyses` VALUES (1,2,1014001,625,0.79,'Q5','food-detection','v1','2026-01-30 05:51:14','{\"box\": {\"x_max\": 0.9946253895759584, \"x_min\": 0.02705291472375393, \"y_max\": 0.9989789724349976, \"y_min\": 0.061045121401548386}, \"quantity\": \"Q5\", \"food_name\": \"01014001\", \"confidence\": 0.79}'),(2,1,1015018,1500,0.84,'Q5','food-detection','v1','2026-01-30 08:37:07','{\"box\": {\"x_max\": 1.0, \"x_min\": 0.0023653507232666016, \"y_max\": 0.9965773820877076, \"y_min\": 0.06462888419628143}, \"quantity\": \"Q5\", \"food_name\": \"01015018\", \"confidence\": 0.84}'),(3,2,1014006,200,0.63,'Q2','food-detection','v1','2026-02-02 00:30:50','{\"box\": {\"x_max\": 1.0, \"x_min\": 0.0001087188720703125, \"y_max\": 1.0, \"y_min\": 0.0}, \"quantity\": \"Q2\", \"food_name\": \"01014006\", \"confidence\": 0.63}'),(4,3,1015013,500,0.43,'Q4','food-detection','v1','2026-02-02 01:09:15','{\"box\": {\"x_max\": 0.998610496520996, \"x_min\": 0.06278087943792343, \"y_max\": 0.942277193069458, \"y_min\": 0.08317050337791443}, \"quantity\": \"Q4\", \"food_name\": \"01015013\", \"confidence\": 0.43}'),(5,4,1015012,1125,0.25,'Q5','food-detection','v1','2026-02-02 01:10:21','{\"box\": {\"x_max\": 0.9999929070472716, \"x_min\": 0.002931356430053711, \"y_max\": 0.8635400533676147, \"y_min\": 0.02582564204931259}, \"quantity\": \"Q5\", \"food_name\": \"01015012\", \"confidence\": 0.25}'),(6,5,1015013,375,0.37,'Q3','food-detection','v1','2026-02-02 01:11:59','{\"box\": {\"x_max\": 0.9959335327148438, \"x_min\": 0.11257505416870116, \"y_max\": 0.9567833542823792, \"y_min\": 0.0464288704097271}, \"quantity\": \"Q3\", \"food_name\": \"01015013\", \"confidence\": 0.37}'),(8,7,1015013,625,0.97,'Q5','food-detection','v1','2026-02-02 01:15:24','{\"box\": {\"x_max\": 0.9430393576622008, \"x_min\": 0.2092873454093933, \"y_max\": 0.8809366226196289, \"y_min\": 0.1149299144744873}, \"quantity\": \"Q5\", \"food_name\": \"01015013\", \"confidence\": 0.97}'),(9,8,1015013,625,0.97,'Q5','food-detection','v1','2026-02-02 01:17:11','{\"box\": {\"x_max\": 0.972430408000946, \"x_min\": 0.09024512767791748, \"y_max\": 0.9535802602767944, \"y_min\": 0.04514150694012642}, \"quantity\": \"Q5\", \"food_name\": \"01015013\", \"confidence\": 0.97}'),(14,13,1014010,562.5,0.89,'Q5','food-detection','v1','2026-02-02 05:42:17','{\"box\": {\"x_max\": 0.9780619740486144, \"x_min\": 0.003487539477646351, \"y_max\": 0.822870135307312, \"y_min\": 0.228618785738945}, \"quantity\": \"Q5\", \"food_name\": \"01014010\", \"confidence\": 0.89}'),(15,14,1015013,625,0.94,'Q5','food-detection','v1','2026-02-02 06:07:05','{\"box\": {\"x_max\": 0.9953253865242004, \"x_min\": 0.05465865135192871, \"y_max\": 0.8942657113075256, \"y_min\": 0.04233808442950249}, \"quantity\": \"Q5\", \"food_name\": \"01015013\", \"confidence\": 0.94}'),(16,15,1015013,625,0.94,'Q5','food-detection','v1','2026-02-02 07:57:49','{\"box\": {\"x_max\": 0.9953253865242004, \"x_min\": 0.05465865135192871, \"y_max\": 0.8942657113075256, \"y_min\": 0.04233808442950249}, \"quantity\": \"Q5\", \"food_name\": \"01015013\", \"confidence\": 0.94}'),(22,21,1014011,450,NULL,'AI server returned no detectable food.','food-detection','v1','2026-02-03 01:42:10',NULL),(24,23,1015013,500,NULL,'AI server returned no detectable food.','food-detection','v1','2026-02-03 05:45:22',NULL),(25,24,1014011,450,NULL,'AI server returned no detectable food.','food-detection','v1','2026-02-04 06:22:42',NULL),(26,25,1014010,450,NULL,'AI server returned no detectable food.','food-detection','v1','2026-02-04 08:06:35',NULL),(27,26,1015013,500,NULL,'AI server returned no detectable food.','food-detection','v1','2026-02-05 02:49:17',NULL);
/*!40000 ALTER TABLE `food_analyses` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-07  0:20:57
