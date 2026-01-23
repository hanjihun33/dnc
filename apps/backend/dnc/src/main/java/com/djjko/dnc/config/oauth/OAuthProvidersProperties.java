package com.djjko.dnc.config.oauth;

import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "oauth")
public class OAuthProvidersProperties {

    private Map<String, OAuthProviderProperties> providers = new HashMap<>();

    public Map<String, OAuthProviderProperties> getProviders() {
        return providers;
    }

    public void setProviders(Map<String, OAuthProviderProperties> providers) {
        this.providers = providers;
    }

    public OAuthProviderProperties getProvider(String name) {
        OAuthProviderProperties provider = providers.get(name);
        if (provider == null) {
            throw new IllegalArgumentException("지원하지 않는 provider입니다.: " + name);
        }
        return provider;
    }
}
