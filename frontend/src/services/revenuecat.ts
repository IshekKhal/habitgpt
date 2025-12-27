import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// RevenueCat API Keys - Replace with your actual keys
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_YOUR_IOS_KEY';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_YOUR_ANDROID_KEY';

// Product Identifiers - Updated for HabitGPT
export const PRODUCT_IDS = {
  MONTHLY: 'habitgpt_monthly_599',
  YEARLY: 'habitgpt_yearly_5999',
};

// Entitlement Identifier
export const ENTITLEMENT_ID = 'premium';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialActive: boolean;
  trialEndDate?: Date;
  expirationDate?: Date;
  productId?: string;
  willRenew: boolean;
}

// Initialize RevenueCat
export async function initializeRevenueCat(userId?: string): Promise<void> {
  try {
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({ apiKey });

    if (userId) {
      await Purchases.logIn(userId);
    }

    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
}

// Login user to RevenueCat
export async function loginToRevenueCat(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('User logged in to RevenueCat:', userId);
  } catch (error) {
    console.error('Failed to login to RevenueCat:', error);
  }
}

// Logout from RevenueCat
export async function logoutFromRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error('Failed to logout from RevenueCat:', error);
  }
}

// Get available offerings (products)
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();

    if (offerings.current !== null) {
      return offerings.current;
    }

    return null;
  } catch (error: any) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

// Get monthly and yearly packages
export async function getPackages(): Promise<{
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
}> {
  try {
    const offering = await getOfferings();

    if (!offering) {
      return { monthly: null, yearly: null };
    }

    const monthly = offering.monthly || offering.availablePackages.find(
      (pkg) => pkg.product.identifier.includes('monthly')
    ) || null;

    const yearly = offering.annual || offering.availablePackages.find(
      (pkg) => pkg.product.identifier.includes('yearly') || pkg.product.identifier.includes('annual')
    ) || null;

    return { monthly, yearly };
  } catch (error: any) {
    console.error('Failed to get packages:', error);
    return { monthly: null, yearly: null };
  }
}

// Purchase a package
export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    // Check if the user now has the premium entitlement
    const isPremium = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return {
      success: isPremium,
      customerInfo,
    };
  } catch (error: any) {
    // Handle user cancellation
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }

    console.error('Purchase failed:', error);
    return { success: false, error: error.message || 'Purchase failed' };
  }
}

// Get current subscription status
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (!entitlement) {
      return {
        isSubscribed: false,
        isTrialActive: false,
        willRenew: false,
      };
    }

    const isTrialActive = entitlement.periodType === 'TRIAL';
    const expirationDate = entitlement.expirationDate
      ? new Date(entitlement.expirationDate)
      : undefined;

    return {
      isSubscribed: true,
      isTrialActive,
      trialEndDate: isTrialActive ? expirationDate : undefined,
      expirationDate,
      productId: entitlement.productIdentifier,
      willRenew: entitlement.willRenew,
    };
  } catch (error: any) {
    console.error('Failed to get subscription status:', error);
    return {
      isSubscribed: false,
      isTrialActive: false,
      willRenew: false,
    };
  }
}

// Check if user has active subscription
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
  } catch (error: any) {
    console.error('Failed to check subscription:', error);
    return false;
  }
}

// Restore purchases
export async function restorePurchases(): Promise<{
  success: boolean;
  isSubscribed: boolean;
  error?: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isSubscribed = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return { success: true, isSubscribed };
  } catch (error: any) {
    console.error('Failed to restore purchases:', error);
    return { success: false, isSubscribed: false, error: error.message };
  }
}

// Sync subscription status with backend
export async function syncSubscriptionWithBackend(userId: string): Promise<void> {
  try {
    const status = await getSubscriptionStatus();

    await axios.put(`${API_URL}/api/users/${userId}/subscription`, {
      is_subscribed: status.isSubscribed,
      is_trial_active: status.isTrialActive,
      trial_end_date: status.trialEndDate?.toISOString(),
      expiration_date: status.expirationDate?.toISOString(),
      product_id: status.productId,
      will_renew: status.willRenew,
    });
  } catch (error) {
    console.error('Failed to sync subscription with backend:', error);
  }
}

// Add listener for customer info updates
export function addCustomerInfoUpdateListener(
  callback: (customerInfo: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => Purchases.removeCustomerInfoUpdateListener(callback);
}

// Format price for display
export function formatPrice(priceString: string, currencyCode: string): string {
  return `${currencyCode} ${priceString}`;
}

// Calculate savings percentage for yearly vs monthly
export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
  const yearlyMonthlyEquivalent = monthlyPrice * 12;
  const savings = ((yearlyMonthlyEquivalent - yearlyPrice) / yearlyMonthlyEquivalent) * 100;
  return Math.round(savings);
}
