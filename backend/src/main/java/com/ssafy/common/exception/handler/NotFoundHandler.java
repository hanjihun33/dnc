package com.ssafy.common.exception.handler;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.ResourceUtils;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.NoHandlerFoundException;

/*
 * 
 * SPA처리를 위한 ControllerAdvice.
 * 요청에 해당하는 Request Mapping이 존재하지 않을 경우 Default로 index.html을 렌더링한다.
 * 
 */

@ControllerAdvice
public class NotFoundHandler {
	@Value("${spa.default-file}")
	String defaultFile;
	 
	@ExceptionHandler(NoHandlerFoundException.class)
	public ResponseEntity<String> renderDefaultPage(NoHandlerFoundException ex) {
		String url = ex.getRequestURL();
		// API 경로는 404 반환
		if(url.startsWith("/api/")) {
			return ResponseEntity.notFound().build();
		}
		// 정적 리소스 경로는 404 반환 (리소스 핸들러가 처리해야 함)
		if(url.startsWith("/assets/") || 
		   url.startsWith("/css/") || 
		   url.startsWith("/js/") || 
		   url.startsWith("/img/") || 
		   url.startsWith("/fonts/") || 
		   url.startsWith("/icons/") || 
		   url.startsWith("/resources/") ||
		   url.startsWith("/dist/") ||
		   url.startsWith("/upload/") ||
		   url.startsWith("/swagger") ||
		   url.startsWith("/actuator") ||
		   url.startsWith("/webjars/") ||
		   url.equals("/favicon.ico")) {
			return ResponseEntity.notFound().build();
		}
		// 그 외의 경로는 SPA 라우팅을 위해 index.html 반환
		try {
			ClassPathResource classPathResource = new ClassPathResource(defaultFile);
			InputStream inputStream = classPathResource.getInputStream();
			String body = StreamUtils.copyToString(inputStream, Charset.defaultCharset());
			return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(body);
		} catch (IOException e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("There was an error completing the action.");
		}
	}
}
