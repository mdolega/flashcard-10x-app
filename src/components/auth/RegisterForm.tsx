import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import type { RegisterFormState } from "../../types/auth.types";

const RegisterForm: React.FC = () => {
  const [formState, setFormState] = useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
    errors: {},
    isLoading: false,
  });

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return "Email jest wymagany.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Nieprawidłowy format email.";
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Hasło jest wymagane.";
    if (password.length < 8) return "Hasło musi mieć co najmniej 8 znaków.";
    return undefined;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return "Potwierdzenie hasła jest wymagane.";
    if (password !== confirmPassword) return "Hasła nie są zgodne.";
    return undefined;
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(formState.email);
    const passwordError = validatePassword(formState.password);
    const confirmPasswordError = validateConfirmPassword(formState.password, formState.confirmPassword);

    const errors = {
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    };

    setFormState((prev) => ({ ...prev, errors }));
    return !emailError && !passwordError && !confirmPasswordError;
  };

  const handleInputChange = (field: keyof RegisterFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: undefined, general: undefined },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormState((prev) => ({ ...prev, isLoading: true, errors: {} }));

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formState.email,
          password: formState.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Successful registration - redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        // Handle API errors
        let errorMessage = data.message || "Wystąpił błąd podczas rejestracji.";

        // Handle specific error codes
        if (response.status === 409) {
          errorMessage = "Email już w użyciu.";
        }

        setFormState((prev) => ({
          ...prev,
          errors: { general: errorMessage },
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error("Registration error:", error);
      setFormState((prev) => ({
        ...prev,
        errors: { general: "Wystąpił błąd podczas rejestracji. Spróbuj ponownie." },
        isLoading: false,
      }));
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Rejestracja</CardTitle>
        <CardDescription className="text-center text-gray-600">Utwórz swoje konto, aby rozpocząć naukę</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {formState.errors.general && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3" role="alert" aria-live="polite">
              <p className="text-sm text-red-800">{formState.errors.general}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.com"
              value={formState.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={formState.errors.email ? "border-red-500 focus:border-red-500" : ""}
              disabled={formState.isLoading}
              autoComplete="email"
              aria-describedby={formState.errors.email ? "email-error" : undefined}
            />
            {formState.errors.email && (
              <p id="email-error" className="text-sm text-red-600" role="alert">
                {formState.errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Hasło
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Co najmniej 8 znaków"
              value={formState.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className={formState.errors.password ? "border-red-500 focus:border-red-500" : ""}
              disabled={formState.isLoading}
              autoComplete="new-password"
              aria-describedby={formState.errors.password ? "password-error" : "password-help"}
            />
            {formState.errors.password ? (
              <p id="password-error" className="text-sm text-red-600" role="alert">
                {formState.errors.password}
              </p>
            ) : (
              <p id="password-help" className="text-xs text-gray-500">
                Hasło musi mieć co najmniej 8 znaków.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Potwierdź hasło
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Wprowadź hasło ponownie"
              value={formState.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className={formState.errors.confirmPassword ? "border-red-500 focus:border-red-500" : ""}
              disabled={formState.isLoading}
              autoComplete="new-password"
              aria-describedby={formState.errors.confirmPassword ? "confirm-password-error" : undefined}
            />
            {formState.errors.confirmPassword && (
              <p id="confirm-password-error" className="text-sm text-red-600" role="alert">
                {formState.errors.confirmPassword}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={formState.isLoading}>
            {formState.isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Rejestrowanie...
              </>
            ) : (
              "Zarejestruj się"
            )}
          </Button>

          <div className="text-center text-sm text-gray-600">
            <p>
              Masz już konto?{" "}
              <a
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Zaloguj się
              </a>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};

export default RegisterForm;
