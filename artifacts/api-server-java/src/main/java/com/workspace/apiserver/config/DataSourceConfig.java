package com.workspace.apiserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DataSourceConfig {

    @Value("${spring.datasource.url:}")
    private String springUrl;

    @Value("${spring.datasource.username:}")
    private String springUsername;

    @Value("${spring.datasource.password:}")
    private String springPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        String databaseUrl = System.getenv("DATABASE_URL");
        
        // If DATABASE_URL is set and starts with mysql://, we parse it
        if (databaseUrl != null && databaseUrl.startsWith("mysql://")) {
            try {
                URI uri = new URI(databaseUrl);
                String userInfo = uri.getUserInfo();
                String username = "";
                String password = "";
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = URLDecoder.decode(parts[0], StandardCharsets.UTF_8.toString());
                    password = URLDecoder.decode(parts[1], StandardCharsets.UTF_8.toString());
                }
                
                String host = uri.getHost();
                int port = uri.getPort();
                if (port == -1) {
                    port = 3306;
                }
                String dbName = uri.getPath();
                if (dbName.startsWith("/")) {
                    dbName = dbName.substring(1);
                }
                
                String jdbcUrl = String.format("jdbc:mysql://%s:%d/%s?createDatabaseIfNotExist=true&allowPublicKeyRetrieval=true&useSSL=false", 
                        host, port, dbName);
                
                DriverManagerDataSource dataSource = new DriverManagerDataSource();
                dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
                dataSource.setUrl(jdbcUrl);
                dataSource.setUsername(username);
                dataSource.setPassword(password);
                return dataSource;
            } catch (Exception e) {
                // If parsing fails, fall back to default properties
                System.err.println("Error parsing DATABASE_URL, falling back to Spring properties: " + e.getMessage());
            }
        }
        
        // Default fallback using standard Spring datasource properties
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        dataSource.setUrl(springUrl);
        dataSource.setUsername(springUsername);
        dataSource.setPassword(springPassword);
        return dataSource;
    }
}
