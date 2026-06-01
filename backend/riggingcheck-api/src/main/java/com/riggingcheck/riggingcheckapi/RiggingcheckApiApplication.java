package com.riggingcheck.riggingcheckapi;

import com.riggingcheck.riggingcheckapi.dto.SetupRequest;
import com.riggingcheck.riggingcheckapi.service.AuthService;
import com.riggingcheck.riggingcheckapi.exception.RegraDeNegocioException;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.util.TimeZone;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class RiggingcheckApiApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
        SpringApplication.run(RiggingcheckApiApplication.class, args);
    }

    @PostConstruct
    public void aplicarFusoHorario() {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
    }

    @Bean
    public CommandLineRunner initSuperAdmin(AuthService authService) {
        return args -> {
            try {
                SetupRequest request = new SetupRequest();
                request.setNome("Super Admin");
                request.setEmail("admin@riggingcheck.com");
                request.setSenha("ShinraTense1@");
                authService.setupSuperAdmin(request);
                System.out.println("Super Admin padrao criado com sucesso.");
            } catch (RegraDeNegocioException e) {
                // Já existe um super admin configurado, apenas ignora
                System.out.println("Super Admin ja configurado. Pulando criacao.");
            }
        };
    }
}
