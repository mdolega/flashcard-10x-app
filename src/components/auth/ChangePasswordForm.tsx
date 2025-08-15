import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import type { ChangePasswordFormState } from "../../types/auth.types";

const ChangePasswordForm: React.FC = () => {
  const [formState, setFormState] = useState<ChangePasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    errors: {},
    isLoading: false,
  });

  const [successMessage, setSuccessMessage] = useState<string>("");

  const validateCurrentPassword = (password: string): string | undefined => {
    if (!password) return "Obecne hasło jest wymagane.";
    return undefined;
  };

  const validateNewPassword = (password: string): string | undefined => {
    if (!password) return "Nowe hasło jest wymagane.";
    if (password.length < 8) return "Nowe hasło musi mieć co najmniej 8 znaków.";
    return undefined;
  };

  const validateConfirmPassword = (newPassword: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return "Potwierdzenie nowego hasła jest wymagane.";
    if (newPassword !== confirmPassword) return "Nowe hasła nie są zgodne.";
    return undefined;
  };

  const validateForm = (): boolean => {
    const currentPasswordError = validateCurrentPassword(formState.currentPassword);
    const newPasswordError = validateNewPassword(formState.newPassword);
    const confirmPasswordError = validateConfirmPassword(formState.newPassword, formState.confirmPassword);

    const errors = {
      currentPassword: currentPasswordError,
      newPassword: newPasswordError,
      confirmPassword: confirmPasswordError,
    };

    setFormState((prev) => ({ ...prev, errors }));
    return !currentPasswordError && !newPasswordError && !confirmPasswordError;
  };

  const handleInputChange = (field: keyof ChangePasswordFormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: undefined, general: undefined },
    }));

    // Clear success message when user starts typing
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormState((prev) => ({ ...prev, isLoading: true, errors: {} }));
    setSuccessMessage("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formState.currentPassword,
          newPassword: formState.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Successful password change
        setSuccessMessage("Hasło zostało pomyślnie zmienione.");
        setFormState({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          errors: {},
          isLoading: false,
        });
      } else {
        // Handle API errors
        let errorMessage = data.message || "Wystąpił błąd podczas zmiany hasła.";

        // Handle specific error codes
        if (response.status === 403) {
          errorMessage = "Nieprawidłowe obecne hasło.";
        }

        setFormState((prev) => ({
          ...prev,
          errors: { general: errorMessage },
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error("Change password error:", error);
      setFormState((prev) => ({
        ...prev,
        errors: { general: "Wystąpił błąd podczas zmiany hasła. Spróbuj ponownie." },
        isLoading: false,
      }));
    }
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Zmiana hasła</CardTitle>
          <CardDescription className="text-center text-gray-600">Wprowadź obecne hasło i ustaw nowe</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {successMessage && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3" role="alert" aria-live="polite">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            {formState.errors.general && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3" role="alert" aria-live="polite">
                <p className="text-sm text-red-800">{formState.errors.general}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                Obecne hasło
              </label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Wprowadź obecne hasło"
                value={formState.currentPassword}
                onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                className={formState.errors.currentPassword ? "border-red-500 focus:border-red-500" : ""}
                disabled={formState.isLoading}
                autoComplete="current-password"
                aria-describedby={formState.errors.currentPassword ? "current-password-error" : undefined}
              />
              {formState.errors.currentPassword && (
                <p id="current-password-error" className="text-sm text-red-600" role="alert">
                  {formState.errors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                Nowe hasło
              </label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Co najmniej 8 znaków"
                value={formState.newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                className={formState.errors.newPassword ? "border-red-500 focus:border-red-500" : ""}
                disabled={formState.isLoading}
                autoComplete="new-password"
                aria-describedby={formState.errors.newPassword ? "new-password-error" : "new-password-help"}
              />
              {formState.errors.newPassword ? (
                <p id="new-password-error" className="text-sm text-red-600" role="alert">
                  {formState.errors.newPassword}
                </p>
              ) : (
                <p id="new-password-help" className="text-xs text-gray-500">
                  Nowe hasło musi mieć co najmniej 8 znaków.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Potwierdź nowe hasło
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Wprowadź nowe hasło ponownie"
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
                  Zmienianie hasła...
                </>
              ) : (
                "Zmień hasło"
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <a
                href="/dashboard"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Powrót do Dashboard
              </a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ChangePasswordForm;
