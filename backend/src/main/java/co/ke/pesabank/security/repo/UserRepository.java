package co.ke.pesabank.security.repo;

import co.ke.pesabank.security.domain.Role;
import co.ke.pesabank.security.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findAllByRole(Role role);
    long countByRole(Role role);
    List<User> findAllByOrderByCreatedAtDesc();
}