package com.ssafy.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 루트 경로(/)를 처리하여 index.html을 반환하는 컨트롤러.
 * @Order(Ordered.LOWEST_PRECEDENCE)로 설정하여 리소스 핸들러보다 낮은 우선순위를 가진다.
 */
@Controller
@Order(Ordered.LOWEST_PRECEDENCE)
public class IndexController {

    private static final String INDEX_PATH = "/dist/index.html";
    
    @GetMapping("/")
    public ResponseEntity<String> serveIndex() throws IOException {
        ClassPathResource resource = new ClassPathResource(INDEX_PATH);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        String body = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .body(body);
    }
}

