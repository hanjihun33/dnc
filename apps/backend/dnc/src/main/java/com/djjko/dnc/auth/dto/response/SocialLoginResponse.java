package com.djjko.dnc.auth.dto.response;

public class SocialLoginResponse {

    private Long userId;
    private boolean newUser;
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;

    public SocialLoginResponse() {
    }

    public SocialLoginResponse(
        Long userId,
        boolean newUser,
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn
    ) {
        this.userId = userId;
        this.newUser = newUser;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType;
        this.expiresIn = expiresIn;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public boolean isNewUser() {
        return newUser;
    }

    public void setNewUser(boolean newUser) {
        this.newUser = newUser;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(long expiresIn) {
        this.expiresIn = expiresIn;
    }
}
