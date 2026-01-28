package com.djjko.dnc.push.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.service-account:}")
    private String serviceAccountPath;

    @PostConstruct
    public void init() {
        if (FirebaseApp.getApps().size() > 0) {
            return;
        }
        if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
            log.warn("Firebase service account path is not configured. FCM disabled.");
            return;
        }
        try (FileInputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("FirebaseApp initialized.");
        } catch (IOException e) {
            log.error("Failed to initialize FirebaseApp: {}", e.getMessage());
        }
    }
}
