import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

type AuthMode = "login" | "register" | "reset" | "update" | "change";

interface AuthFormProps {
  mode: AuthMode;
}

interface FormState {
  email: string;
  password: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  token: string;
  errors: Record<string, string>;
  isLoading: boolean;
  isSuccess: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    token: "",
    errors: {},
    isLoading: false,
    isSuccess: false,
  });

  // Initialize token from URL params after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get("token");
      if (tokenFromUrl) {
        setFormState((prev) => ({ ...prev, token: tokenFromUrl }));
      }
    }
  }, []);

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
    if (password !== confirmPassword) return "Hasła nie są identyczne.";
    return undefined;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (mode === "login" || mode === "register") {
      const emailError = validateEmail(formState.email);
      const passwordError = validatePassword(formState.password);

      if (emailError) errors.email = emailError;
      if (passwordError) errors.password = passwordError;

      if (mode === "register") {
        const confirmError = validateConfirmPassword(formState.password, formState.confirmPassword);
        if (confirmError) errors.confirmPassword = confirmError;
      }
    }

    if (mode === "reset") {
      const emailError = validateEmail(formState.email);
      if (emailError) errors.email = emailError;
    }

    if (mode === "update") {
      const passwordError = validatePassword(formState.newPassword);
      const confirmError = validateConfirmPassword(formState.newPassword, formState.confirmPassword);

      if (passwordError) errors.newPassword = passwordError;
      if (confirmError) errors.confirmPassword = confirmError;
      if (!formState.token) errors.token = "Token jest wymagany.";
    }

    if (mode === "change") {
      const currentPasswordError = formState.currentPassword ? undefined : "Obecne hasło jest wymagane.";
      const newPasswordError = validatePassword(formState.newPassword);
      const confirmError = validateConfirmPassword(formState.newPassword, formState.confirmPassword);

      if (currentPasswordError) errors.currentPassword = currentPasswordError;
      if (newPasswordError) errors.newPassword = newPasswordError;
      if (confirmError) errors.confirmPassword = confirmError;
    }

    setFormState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      errors: Object.fromEntries(Object.entries(prev.errors).filter(([key]) => key !== field && key !== "general")),
    }));
  };

  const getApiEndpoint = (): string => {
    switch (mode) {
      case "login":
        return "/api/auth/login";
      case "register":
        return "/api/auth/register";
      case "reset":
        return "/api/auth/password-reset";
      case "update":
        return "/api/auth/password-update";
      case "change":
        return "/api/auth/change-password";
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }
  };

  const getPayload = () => {
    switch (mode) {
      case "login":
        return { email: formState.email, password: formState.password };
      case "register":
        return { email: formState.email, password: formState.password };
      case "reset":
        return { email: formState.email };
      case "update":
        return { token: formState.token, newPassword: formState.newPassword };
      case "change":
        return { currentPassword: formState.currentPassword, newPassword: formState.newPassword };
      default:
        return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormState((prev) => ({ ...prev, isLoading: true, errors: {} }));

    try {
      const response = await fetch(getApiEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getPayload()),
      });

      const data = await response.json();

      if (response.ok) {
        if (mode === "reset") {
          setFormState((prev) => ({ ...prev, isSuccess: true, isLoading: false }));
        } else if (mode === "login") {
          if (typeof window !== "undefined") {
            window.location.href = "/dashboard";
          }
        } else if (mode === "register") {
          if (typeof window !== "undefined") {
            window.location.href = "/auth?mode=login";
          }
        } else if (mode === "update") {
          if (typeof window !== "undefined") {
            window.location.href = "/auth?mode=login";
          }
        } else if (mode === "change") {
          setFormState((prev) => ({ ...prev, isSuccess: true, isLoading: false }));
        }
      } else {
        const errorMessage = data.message || "Wystąpił błąd.";
        setFormState((prev) => ({
          ...prev,
          errors: { general: errorMessage },
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error(`${mode} error:`, error);
      setFormState((prev) => ({
        ...prev,
        errors: { general: "Wystąpił błąd. Spróbuj ponownie." },
        isLoading: false,
      }));
    }
  };

  const getFormConfig = () => {
    switch (mode) {
      case "login":
        return {
          title: "Logowanie",
          description: "Wprowadź swoje dane, aby się zalogować",
          buttonText: "Zaloguj się",
          linkText: "Nie masz konta? Zarejestruj się",
          linkHref: "/auth?mode=register",
        };
      case "register":
        return {
          title: "Rejestracja",
          description: "Utwórz nowe konto",
          buttonText: "Zarejestruj się",
          linkText: "Masz już konto? Zaloguj się",
          linkHref: "/auth?mode=login",
        };
      case "reset":
        return {
          title: "Reset hasła",
          description: "Wprowadź email, aby otrzymać link do resetowania hasła",
          buttonText: "Wyślij link",
          linkText: "Powrót do logowania",
          linkHref: "/auth?mode=login",
        };
      case "update":
        return {
          title: "Nowe hasło",
          description: "Wprowadź nowe hasło",
          buttonText: "Zmień hasło",
          linkText: "Powrót do logowania",
          linkHref: "/auth?mode=login",
        };
      case "change":
        return {
          title: "Zmiana hasła",
          description: "Wprowadź obecne i nowe hasło",
          buttonText: "Zmień hasło",
          linkText: "Powrót do pulpitu",
          linkHref: "/dashboard",
        };
      default:
        return {
          title: "Uwierzytelnianie",
          description: "",
          buttonText: "Potwierdź",
          linkText: "",
          linkHref: "",
        };
    }
  };

  const config = getFormConfig();

  if (formState.isSuccess && (mode === "reset" || mode === "change")) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-green-600">Sukces!</CardTitle>
          <CardDescription className="text-center text-gray-600">
            {mode === "reset"
              ? "Link do resetowania hasła został wysłany na podany email."
              : "Hasło zostało pomyślnie zmienione."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = config.linkHref;
              }
            }}
            className="w-full"
          >
            {config.linkText}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">{config.title}</CardTitle>
        <CardDescription className="text-center text-gray-600">{config.description}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {formState.errors.general && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3" role="alert" aria-live="polite">
              <p className="text-sm text-red-800">{formState.errors.general}</p>
            </div>
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && (
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
              />
              {formState.errors.email && (
                <p className="text-sm text-red-600" role="alert">
                  {formState.errors.email}
                </p>
              )}
            </div>
          )}

          {mode === "login" && (
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Hasło
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Wprowadź hasło"
                value={formState.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={formState.errors.password ? "border-red-500 focus:border-red-500" : ""}
                disabled={formState.isLoading}
                autoComplete="current-password"
              />
              {formState.errors.password && (
                <p className="text-sm text-red-600" role="alert">
                  {formState.errors.password}
                </p>
              )}
            </div>
          )}

          {mode === "register" && (
            <>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Hasło
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Wprowadź hasło (min. 8 znaków)"
                  value={formState.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={formState.errors.password ? "border-red-500 focus:border-red-500" : ""}
                  disabled={formState.isLoading}
                  autoComplete="new-password"
                />
                {formState.errors.password && (
                  <p className="text-sm text-red-600" role="alert">
                    {formState.errors.password}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Powtórz hasło
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtórz hasło"
                  value={formState.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={formState.errors.confirmPassword ? "border-red-500 focus:border-red-500" : ""}
                  disabled={formState.isLoading}
                  autoComplete="new-password"
                />
                {formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {formState.errors.confirmPassword}
                  </p>
                )}
              </div>
            </>
          )}

          {mode === "change" && (
            <>
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
                />
                {formState.errors.currentPassword && (
                  <p className="text-sm text-red-600" role="alert">
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
                  placeholder="Wprowadź nowe hasło (min. 8 znaków)"
                  value={formState.newPassword}
                  onChange={(e) => handleInputChange("newPassword", e.target.value)}
                  className={formState.errors.newPassword ? "border-red-500 focus:border-red-500" : ""}
                  disabled={formState.isLoading}
                  autoComplete="new-password"
                />
                {formState.errors.newPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {formState.errors.newPassword}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Powtórz nowe hasło
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtórz nowe hasło"
                  value={formState.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={formState.errors.confirmPassword ? "border-red-500 focus:border-red-500" : ""}
                  disabled={formState.isLoading}
                  autoComplete="new-password"
                />
                {formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {formState.errors.confirmPassword}
                  </p>
                )}
              </div>
            </>
          )}

          {mode === "update" && (
            <>
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  Nowe hasło
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Wprowadź nowe hasło (min. 8 znaków)"
                  value={formState.newPassword}
                  onChange={(e) => handleInputChange("newPassword", e.target.value)}
                  className={formState.errors.newPassword ? "border-red-500 focus:border-red-500" : ""}
                  disabled={formState.isLoading}
                  autoComplete="new-password"
                />
                {formState.errors.newPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {formState.errors.newPassword}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Powtórz nowe hasło
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtórz nowe hasło"
                  value={formState.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={formState.errors.confirmPassword ? "border-red-500 focus:border-red-500" : ""}
                  disabled={formState.isLoading}
                  autoComplete="new-password"
                />
                {formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600" role="alert">
                    {formState.errors.confirmPassword}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={formState.isLoading}>
            {formState.isLoading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Przetwarzanie...
              </>
            ) : (
              config.buttonText
            )}
          </Button>

          {config.linkText && (
            <div className="text-center text-sm text-gray-600">
              <a
                href={config.linkHref}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                {config.linkText}
              </a>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};

export default AuthForm;
