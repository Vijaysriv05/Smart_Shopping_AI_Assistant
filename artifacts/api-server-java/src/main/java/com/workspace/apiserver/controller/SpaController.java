package com.workspace.apiserver.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    @RequestMapping(value = {
        "/",
        "/agent/**",
        "/products/**",
        "/compare/**",
        "/dashboard/**",
        "/cart/**",
        "/wishlist/**",
        "/profile/**",
        "/autonomous/**",
        "/login/**",
        "/register/**"
    })
    public String redirect() {
        return "forward:/index.html";
    }
}
