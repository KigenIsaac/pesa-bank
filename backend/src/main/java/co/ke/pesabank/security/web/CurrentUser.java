package co.ke.pesabank.security.web;

import co.ke.pesabank.security.domain.User;
import co.ke.pesabank.shared.error.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

    private CurrentUser() {}

    public static User get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw ApiException.unauthorized("NOT_AUTHENTICATED", "Sign in to continue.");
        }
        return user;
    }
}