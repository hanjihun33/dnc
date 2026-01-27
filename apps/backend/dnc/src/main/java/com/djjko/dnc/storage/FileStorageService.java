package com.djjko.dnc.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class FileStorageService {

    private final String storageType;
    private final String uploadDir;
    private final String urlPath;
    private final String bucket;
    private final String region;
    private final String publicUrl;
    private final S3Client s3Client;

    public FileStorageService(
        @Value("${storage.type:local}") String storageType,
        @Value("${file.upload.dir}") String uploadDir,
        @Value("${file.upload.url-path}") String urlPath,
        @Value("${storage.s3.bucket:}") String bucket,
        @Value("${storage.s3.region:}") String region,
        @Value("${storage.s3.public-url:}") String publicUrl,
        ObjectProvider<S3Client> s3ClientProvider
    ) {
        this.storageType = storageType;
        this.uploadDir = uploadDir;
        this.urlPath = urlPath;
        this.bucket = bucket;
        this.region = region;
        this.publicUrl = publicUrl;
        this.s3Client = s3ClientProvider.getIfAvailable();
    }

    public String save(MultipartFile file) {
        return save(file, null);
    }

    public String save(MultipartFile file, String prefix) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        if ("s3".equalsIgnoreCase(storageType)) {
            return saveToS3(file, prefix);
        }

        return saveToLocal(file, prefix);
    }

    public void deleteByUrl(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        if ("s3".equalsIgnoreCase(storageType)) {
            deleteFromS3(url);
            return;
        }
        deleteFromLocal(url);
    }

    private String saveToLocal(MultipartFile file, String prefix) {
        try {
            Path directory = Paths.get(uploadDir).toAbsolutePath();
            if (prefix != null && !prefix.isBlank()) {
                directory = directory.resolve(normalizePrefix(prefix));
            }
            Files.createDirectories(directory);

            String fileName = UUID.randomUUID() + resolveExtension(file);
            Path target = directory.resolve(fileName);
            file.transferTo(target);

            String normalizedUrlPath = urlPath.endsWith("/") ? urlPath : urlPath + "/";
            if (prefix == null || prefix.isBlank()) {
                return normalizedUrlPath + fileName;
            }
            return normalizedUrlPath + normalizePrefix(prefix) + "/" + fileName;
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to store file.", ex);
        }
    }

    private String saveToS3(MultipartFile file, String prefix) {
        if (s3Client == null) {
            throw new IllegalStateException("S3 client is not configured.");
        }
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("S3 bucket is not configured.");
        }

        String keyPrefix = "uploads/";
        if (prefix != null && !prefix.isBlank()) {
            keyPrefix = keyPrefix + normalizePrefix(prefix) + "/";
        }
        String key = keyPrefix + UUID.randomUUID() + resolveExtension(file);
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(file.getContentType())
            .build();

        try (InputStream inputStream = file.getInputStream()) {
            s3Client.putObject(request, RequestBody.fromInputStream(inputStream, file.getSize()));
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to upload file to S3.", ex);
        }

        return buildPublicUrl(key);
    }

    private void deleteFromLocal(String url) {
        String normalizedUrlPath = urlPath.endsWith("/") ? urlPath : urlPath + "/";
        if (!url.startsWith(normalizedUrlPath)) {
            return;
        }
        String relativePath = url.substring(normalizedUrlPath.length());
        Path target = Paths.get(uploadDir).toAbsolutePath().resolve(relativePath);
        try {
            Files.deleteIfExists(target.normalize());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to delete file.", ex);
        }
    }

    private void deleteFromS3(String url) {
        if (s3Client == null) {
            throw new IllegalStateException("S3 client is not configured.");
        }
        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("S3 bucket is not configured.");
        }
        String keyPrefix = publicUrl;
        if (keyPrefix == null || keyPrefix.isBlank()) {
            if (region == null || region.isBlank()) {
                throw new IllegalStateException("S3 region is not configured.");
            }
            keyPrefix = String.format("https://%s.s3.%s.amazonaws.com/", bucket, region);
        }
        if (!keyPrefix.endsWith("/")) {
            keyPrefix = keyPrefix + "/";
        }
        if (!url.startsWith(keyPrefix)) {
            return;
        }
        String key = url.substring(keyPrefix.length());
        s3Client.deleteObject(builder -> builder.bucket(bucket).key(key));
    }

    private String buildPublicUrl(String key) {
        String baseUrl = publicUrl;
        if (baseUrl == null || baseUrl.isBlank()) {
            if (region == null || region.isBlank()) {
                throw new IllegalStateException("S3 region is not configured.");
            }
            baseUrl = String.format("https://%s.s3.%s.amazonaws.com", bucket, region);
        }
        if (!baseUrl.endsWith("/")) {
            baseUrl = baseUrl + "/";
        }
        return baseUrl + key;
    }

    private String resolveExtension(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        if (originalName == null) {
            return "";
        }
        String safeName = Paths.get(originalName).getFileName().toString();
        int dotIndex = safeName.lastIndexOf('.');
        if (dotIndex == -1) {
            return "";
        }
        return safeName.substring(dotIndex);
    }

    private String normalizePrefix(String prefix) {
        String normalized = prefix.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
