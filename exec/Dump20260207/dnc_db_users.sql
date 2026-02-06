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
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `nickname` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `birth_date` date NOT NULL,
  `diabetes_type` enum('TYPE1','TYPE2','PREDIABETES','OTHER') DEFAULT NULL,
  `diagnosis_year` int DEFAULT NULL,
  `diagnosis_month` int DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `height_cm` decimal(5,2) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `provider` varchar(20) NOT NULL DEFAULT 'local',
  `provider_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dexcom_user_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_provider` (`provider`,`provider_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'jkw4805@naver.com','$2a$10$NX/aCgzQLUGq72zoIq0a6eMYzujqx5N9DiAGSJUyAuvBz/DeUWAwW','enerHi','정관우','1996-01-01','TYPE2',2026,1,'MALE',178.00,90.00,NULL,'local',NULL,'2026-01-26 23:55:31','2026-02-03 02:20:18','9df3a306bfb493e7185f1c43f1464997e3246a261ccdb133b427605761a216c8'),(2,'test@test.com','$2a$10$Szc8YX11DJ5K9GIT1BO6jeb02r6us/yine4ux/RavooUgGlWHiyk.','testuser','test','1997-09-29','TYPE2',2026,1,'MALE',178.00,90.00,'https://dnc-s3-storage.s3.ap-northeast-2.amazonaws.com/uploads/profile/24267f1a-7d37-40a2-9b9f-48fd712cfc88.png','local',NULL,'2026-01-27 18:05:01','2026-01-27 18:05:29',NULL),(3,'devbigone0811@naver.com','$2a$10$OE6ZdqB.crCn.gxQyGLB.uRHLUUTFoCv69go81ZdvB6UmCe0cIDmS','sdsd','김땡이','1996-01-03',NULL,NULL,NULL,'MALE',175.00,78.00,NULL,'local',NULL,'2026-01-30 00:57:29','2026-01-30 00:57:29',NULL),(4,'abata0522@nate.com',NULL,'남윤서','남윤서','1970-01-01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'local',NULL,'2026-01-30 08:35:59','2026-01-30 08:35:59',NULL),(5,'namyunseo85@gmail.com',NULL,'[광주_5반_남윤서]','[광주_5반_남윤서]','1970-01-01',NULL,NULL,NULL,NULL,NULL,NULL,'https://lh3.googleusercontent.com/a/ACg8ocIhP0QV5Rq7cifiWKd3ez-fVRwtkZV8OPqkn-4jLBsXnPku5H2r=s96-c','local',NULL,'2026-01-30 08:36:04','2026-01-30 08:36:04',NULL),(6,'ielli33_onoff_@naver.com',NULL,'라따뚜이','남윤서','1970-01-01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'local',NULL,'2026-02-02 01:04:50','2026-02-02 01:04:50',NULL),(7,'shark6544863@gmail.com','$2a$10$B51rsgZVar5W9Tru63pEDueccrZtrXWSBszS2v.j8xapysot07bpa','으악123','손영록','1999-12-12','TYPE2',2026,2,'MALE',181.00,75.00,NULL,'local',NULL,'2026-02-02 01:04:55','2026-02-02 01:04:55',NULL),(9,'user@user.com','$2a$10$lT698C05mNWA9uZsbPqPyOpIz4Xv1suvcSaTZ78dvqUb6ca3vgs8u','user','박상훈','1998-01-06','TYPE2',2026,2,'MALE',170.00,60.00,NULL,'local',NULL,'2026-02-02 01:15:56','2026-02-02 01:15:56',NULL),(10,'xptmxm@xptmxm.com','$2a$10$OrIYnQrIouSGSA.o/MJOZed.TFSy3ojVUYl8YMVgWWdfe5VL32aAO','김김김','김김김','1997-09-29','TYPE2',2026,2,'MALE',178.00,90.00,NULL,'local',NULL,'2026-02-03 08:20:56','2026-02-03 08:49:26','9df3a306bfb493e7185f1c43f1464997e3246a261ccdb133b427605761a216c8'),(11,'qwe@qwe.com','$2a$10$EVLRjoz3hpRJ6UR3avk00OnVWt3XRcTU.ucMHpbjjbkW8OyhjCxty','Qwe','123','1996-01-01','TYPE1',2026,2,'MALE',178.00,90.00,NULL,'local',NULL,'2026-02-03 08:52:07','2026-02-03 08:59:39','9df3a306bfb493e7185f1c43f1464997e3246a261ccdb133b427605761a216c8'),(12,'123@1234.com','$2a$10$TBcyobvf479VqF1G2o14WO8DaDpc2VZoJx./RT56/fIfHZC3ozDzi','가지마','가가가','1997-01-01',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'local',NULL,'2026-02-04 01:47:12','2026-02-04 02:32:14','9df3a306bfb493e7185f1c43f1464997e3246a261ccdb133b427605761a216c8'),(23,'dnc@dnc.com','$2a$10$Yq07JPpg2Jp.Nnovv3jGKOTl0paYDAv21xUg7EMyH6JPEzLrQRv3q','당낭콩','당낭콩','1998-09-07','TYPE2',2025,2,'MALE',172.00,78.00,NULL,'local',NULL,'2026-02-06 02:28:55','2026-02-06 02:31:02','9df3a306bfb493e7185f1c43f1464997e3246a261ccdb133b427605761a216c8'),(24,'ddd@ddd.com','$2a$10$JY9HCI6.amVmEXRoeHjwsu1MpsynMHS99HR2wPmChfB6vgjtKVDhi','이이이','이이이','1996-01-04',NULL,NULL,NULL,'MALE',170.00,70.00,NULL,'local',NULL,'2026-02-06 14:35:27','2026-02-06 14:35:27',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-07  0:20:56
