import { ExternalAccountClient } from 'google-auth-library';
import { getVercelOidcToken } from '@vercel/oidc';

/**
 * Resolves Google Auth Options dynamically based on runtime environment.
 * For local dev: returns empty options to let the Google GenAI SDK automatically pick up gcloud ADC.
 * For production (Vercel): returns googleAuthOptions configured with an ExternalAccountClient (WIF + Impersonation).
 */
export function getGoogleAuthOptions() {
  const isLocal = !process.env.VERCEL && process.env.NODE_ENV !== 'production';

  if (isLocal) {
    console.log('[Google Auth] Local environment detected. Relying on Application Default Credentials (ADC) impersonation.');
    return {};
  }

  console.log('[Google Auth] Production/Vercel environment detected. Setting up Workload Identity Federation.');
  const provider = process.env.GOOGLE_WORKLOAD_IDENTITY_PROVIDER;
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!provider || !serviceAccount) {
    console.warn('[Google Auth] Missing GOOGLE_WORKLOAD_IDENTITY_PROVIDER or GOOGLE_SERVICE_ACCOUNT_EMAIL. Falling back to default auth.');
    return {};
  }

  const authClient = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience: `//iam.googleapis.com/${provider}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: async () => {
        return await getVercelOidcToken();
      }
    }
  });

  return {
    authClient
  };
}
