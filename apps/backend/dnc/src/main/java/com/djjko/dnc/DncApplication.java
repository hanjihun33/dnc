package com.djjko.dnc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DncApplication {

    public static void main(String[] args) {
        SpringApplication.run(DncApplication.class, args);
    }

}
