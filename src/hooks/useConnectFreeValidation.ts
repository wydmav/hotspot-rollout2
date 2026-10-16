import { useState, useMemo, useCallback } from 'react';

export interface UseConnectFreeValidationOptions {
  initialFirstName?: string;
  initialLastName?: string;
  initialPhone?: string;
  initialCountryCode?: string;
  initialEmail?: string;
  initialTermsAccepted?: boolean;
  isEmailRequired?: boolean;
  isTermsRequired?: boolean;
}

export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  terms?: string;
}

/**
 * Validates email address format:
 * - Must have an '@'
 * - Must have a '.' after the '@'
 * - Follows standard valid email address pattern
 */
export function validateEmailAddress(email: string, isRequired = true): { isValid: boolean; error: string } {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, error: 'Email address is required' };
    }
    return { isValid: true, error: '' };
  }

  // Must contain '@' and '.'
  if (!trimmed.includes('@')) {
    return { isValid: false, error: 'Email address must contain an "@" symbol' };
  }

  const atIndex = trimmed.indexOf('@');
  const domainPart = trimmed.slice(atIndex + 1);

  if (!domainPart.includes('.')) {
    return { isValid: false, error: 'Email domain must contain a "." (e.g. gmail.com)' };
  }

  // Standard RFC regex ensuring no whitespace, valid characters, and valid TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Enter a valid email address (e.g. name@domain.com)' };
  }

  return { isValid: true, error: '' };
}

/**
 * Validates country-specific phone number format:
 * - Lesotho (+266): exactly 8 digits (optional leading 0 stripped)
 * - South Africa (+27): standard 10 digits starting with 0 (or 9 digits without leading 0)
 */
export function validatePhoneNumber(phone: string, countryCode: string): { isValid: boolean; error: string; formattedPhone: string } {
  const digitsOnly = (phone || '').replace(/\D/g, '');
  if (!digitsOnly) {
    return { isValid: false, error: 'Phone number is required', formattedPhone: '' };
  }

  if (countryCode === '+266') {
    // Lesotho (+266): 8-digit exact match
    const lsDigits = digitsOnly.replace(/^0/, '');
    if (lsDigits.length === 8) {
      return { 
        isValid: true, 
        error: '', 
        formattedPhone: `${countryCode} ${lsDigits.slice(0, 4)} ${lsDigits.slice(4)}` 
      };
    }
    return {
      isValid: false,
      error: `Lesotho (+266) numbers must have exactly 8 digits (${lsDigits.length}/8 digits entered, e.g. 58001234)`,
      formattedPhone: digitsOnly
    };
  }

  if (countryCode === '+27') {
    // South Africa (+27): standard South African mobile format (10 digits starting with 0)
    // Also accept 9 digits starting with 6, 7, or 8 (without leading 0)
    if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
      return { 
        isValid: true, 
        error: '', 
        formattedPhone: `${countryCode} ${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}` 
      };
    }
    if (!digitsOnly.startsWith('0') && digitsOnly.length === 9) {
      return { 
        isValid: true, 
        error: '', 
        formattedPhone: `${countryCode} 0${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5)}` 
      };
    }
    return {
      isValid: false,
      error: `South African mobile numbers must be 10 digits starting with 0 (e.g. 0821234567, currently ${digitsOnly.length} digits)`,
      formattedPhone: digitsOnly
    };
  }

  // Fallback for other country codes
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return { isValid: true, error: '', formattedPhone: `${countryCode} ${digitsOnly}` };
  }

  return { isValid: false, error: 'Phone number must be at least 7 digits', formattedPhone: digitsOnly };
}

/**
 * Form validation hook for the 'Connect Free' captive portal UI.
 * Enforces:
 * 1. At least two characters for First Name
 * 2. At least two characters for Last Name / Surname
 * 3. 8-digit exact match for Lesotho (+266) numbers
 * 4. Standard South African mobile format (10 digits starting with 0) for (+27)
 * 5. Valid email address format containing '@' and '.'
 * 6. Terms acceptance (if required)
 */
export function useConnectFreeValidation(options: UseConnectFreeValidationOptions = {}) {
  const {
    initialFirstName = '',
    initialLastName = '',
    initialPhone = '',
    initialCountryCode = '+266',
    initialEmail = '',
    initialTermsAccepted = false,
    isEmailRequired = true,
    isTermsRequired = false,
  } = options;

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [email, setEmail] = useState(initialEmail);
  const [termsAccepted, setTermsAccepted] = useState(initialTermsAccepted);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // 1. First name validation (at least 2 characters)
  const isFirstNameValid = useMemo(() => {
    return (firstName || '').trim().length >= 2;
  }, [firstName]);

  const firstNameError = useMemo(() => {
    if (!firstName && !touched.firstName) return '';
    if ((firstName || '').trim().length === 0) return 'First name is required';
    if ((firstName || '').trim().length < 2) return 'First name must be at least 2 characters';
    return '';
  }, [firstName, touched.firstName]);

  // 2. Last name / surname validation (at least 2 characters)
  const isLastNameValid = useMemo(() => {
    return (lastName || '').trim().length >= 2;
  }, [lastName]);

  const lastNameError = useMemo(() => {
    if (!lastName && !touched.lastName) return '';
    if ((lastName || '').trim().length === 0) return 'Last name is required';
    if ((lastName || '').trim().length < 2) return 'Last name must be at least 2 characters';
    return '';
  }, [lastName, touched.lastName]);

  // 3. Country-specific phone validation
  const phoneValidation = useMemo(() => {
    return validatePhoneNumber(phone, countryCode);
  }, [phone, countryCode]);

  const isPhoneValid = phoneValidation.isValid;
  const phoneError = useMemo(() => {
    if (!phone && !touched.phone) return '';
    return phoneValidation.error;
  }, [phone, touched.phone, phoneValidation]);

  // 4. Email validation (must have @ and ., valid syntax)
  const emailValidation = useMemo(() => {
    return validateEmailAddress(email, isEmailRequired);
  }, [email, isEmailRequired]);

  const isEmailValid = emailValidation.isValid;
  const emailError = useMemo(() => {
    if (!email && !touched.email && !isEmailRequired) return '';
    if (!email && !touched.email && isEmailRequired) return '';
    return emailValidation.error;
  }, [email, touched.email, isEmailRequired, emailValidation]);

  // 5. Terms validation
  const isTermsValid = useMemo(() => {
    if (!isTermsRequired) return true;
    return Boolean(termsAccepted);
  }, [isTermsRequired, termsAccepted]);

  const termsError = useMemo(() => {
    if (!isTermsRequired) return '';
    if (!termsAccepted && touched.terms) return 'You must accept the Terms of Use to connect';
    return '';
  }, [isTermsRequired, termsAccepted, touched.terms]);

  // Overall form validity
  const isFormValid = Boolean(
    isFirstNameValid &&
    isLastNameValid &&
    isPhoneValid &&
    isEmailValid &&
    isTermsValid
  );

  const errors: ValidationErrors = useMemo(() => {
    const errs: ValidationErrors = {};
    if (firstNameError) errs.firstName = firstNameError;
    if (lastNameError) errs.lastName = lastNameError;
    if (phoneError) errs.phone = phoneError;
    if (emailError) errs.email = emailError;
    if (termsError) errs.terms = termsError;
    return errs;
  }, [firstNameError, lastNameError, phoneError, emailError, termsError]);

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const markAllTouched = useCallback(() => {
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      terms: true
    });
  }, []);

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setTermsAccepted(false);
    setTouched({});
  }, []);

  const fillSampleData = useCallback((preset?: {
    firstName?: string;
    lastName?: string;
    countryCode?: string;
    phone?: string;
    email?: string;
  }) => {
    const isLesotho = (preset?.countryCode || countryCode) === '+266';
    setFirstName(preset?.firstName || (isLesotho ? 'Katleho' : 'Sipho'));
    setLastName(preset?.lastName || (isLesotho ? 'Molapo' : 'Dlamini'));
    setCountryCode(preset?.countryCode || (isLesotho ? '+266' : '+27'));
    setPhone(preset?.phone || (isLesotho ? '58001234' : '0821234567'));
    setEmail(preset?.email || (isLesotho ? 'katleho.molapo@tconnect.ls' : 'sipho.dlamini@vodamail.co.za'));
    setTermsAccepted(true);
    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      terms: true
    });
  }, [countryCode]);

  return {
    // Values
    firstName,
    lastName,
    phone,
    countryCode,
    email,
    termsAccepted,
    fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
    fullPhone: phoneValidation.formattedPhone || `${countryCode} ${phone.trim()}`,
    // Setters
    setFirstName,
    setLastName,
    setPhone,
    setCountryCode,
    setEmail,
    setTermsAccepted,
    // Validity flags
    isFirstNameValid,
    isLastNameValid,
    isPhoneValid,
    isEmailValid,
    isTermsValid,
    isFormValid,
    // Error messages
    firstNameError,
    lastNameError,
    phoneError,
    emailError,
    termsError,
    errors,
    // Helpers
    markTouched,
    markAllTouched,
    resetForm,
    fillSampleData
  };
}
