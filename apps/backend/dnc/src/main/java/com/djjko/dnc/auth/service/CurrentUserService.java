package com.djjko.dnc.auth.service;

import com.djjko.dnc.auth.entity.User;
import com.djjko.dnc.auth.repository.UserRepository;
import com.djjko.dnc.auth.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

/**
 * Resolves the current authenticated user.
 * Prefers SecurityContext, with a fallback to parsing the Authorization header.
 */
@Slf4j
@Service
public class CurrentUserService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public CurrentUserService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    public User getRequiredUser() {
        return resolveUser()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required"));
    }

    public Long getRequiredUserId() {
        return getRequiredUser().getUserId();
    }

    private Optional<User> resolveUser() {
        Optional<User> fromContext = resolveFromSecurityContext();
        if (fromContext.isPresent()) {
            return fromContext;
        }
        return resolveFromAuthorizationHeader();
    }

    private Optional<User> resolveFromSecurityContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
            || !authentication.isAuthenticated()
            || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        return userRepository.findByEmail(authentication.getName());
    }

    private Optional<User> resolveFromAuthorizationHeader() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return Optional.empty();
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }

        String token = authHeader.substring(7);
        try {
            jwtUtil.validateAccessToken(token);
            Long userId = jwtUtil.getUserId(token);
            return userRepository.findById(userId);
        } catch (Exception e) {
            log.warn("Failed to resolve current user from Authorization header: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private HttpServletRequest currentRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }
}

