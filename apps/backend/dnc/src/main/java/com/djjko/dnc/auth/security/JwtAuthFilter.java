package com.djjko.dnc.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import com.djjko.dnc.auth.repository.UserRepository;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                // 1. 'access' 타입 토큰 검증
                jwtUtil.validateAccessToken(token);

                // 2. 인증 정보가 없다면, 유저 정보를 SecurityContext에 설정
                if (SecurityContextHolder.getContext().getAuthentication() == null) {
                    String email = jwtUtil.getEmail(token);
                    userRepository.findByEmail(email).ifPresentOrElse(user -> {
                        // UserDetails 객체 생성 (Spring Security의 User 클래스 사용)
                        org.springframework.security.core.userdetails.User userDetails = new org.springframework.security.core.userdetails.User(
                                user.getEmail(),
                                "", // password는 JWT 인증에서 사용하지 않음
                                List.of(new SimpleGrantedAuthority("ROLE_USER")));

                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails, // UserDetails 객체를 principal로 설정
                                null,
                                userDetails.getAuthorities());
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }, SecurityContextHolder::clearContext);
                }
            } catch (Exception e) {
                // 토큰이 유효하지 않을 경우, SecurityContext를 클리어하고, 다음 필터로 넘어감
                // 클라이언트는 401 Unauthorized 또는 관련 에러 응답을 받게 됨
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
