import React, { useState } from 'react';

export type LoginPhoneMode = 'login' | 'signup';

const SIGNUP_PROOF_ITEMS = [
  {
    brand: 'dominos',
    brandLabel: 'דומינוס',
    mutedBefore: 'שולחים',
    highlight: '11,000',
    mutedAfter: 'פיצות ביום',
  },
  {
    brand: 'pizzahut',
    brandLabel: 'פיצה האט',
    mutedBefore: 'שולחים',
    highlight: '9,000',
    mutedAfter: 'פיצות ביום',
  },
  {
    brand: 'mcdonalds',
    brandLabel: 'מקדונלדס',
    mutedBefore: 'שולחים',
    highlight: '15,000',
    mutedAfter: 'המבורגרים ביום',
  },
] as const;

const SignupProofLogo: React.FC<{
  brand: (typeof SIGNUP_PROOF_ITEMS)[number]['brand'];
  label: string;
}> = ({ brand, label }) => {
  if (brand === 'pizzahut') {
    return (
      <svg
        className="signup-proof-ticker__logo signup-proof-ticker__logo--pizzahut"
        role="img"
        viewBox="0 0 24 24"
        aria-label={label}
      >
        <path
          fill="#e2231a"
          d="M3.2 10.9c1.9-4.1 5-6.2 8.8-6.2s6.9 2.1 8.8 6.2c-4.9-1.7-12.7-1.7-17.6 0Z"
        />
        <path
          fill="#f8f3e8"
          d="M5.4 12.2h13.2l-1.1 6.1c-.2 1.1-1.1 1.9-2.2 1.9H8.7c-1.1 0-2-.8-2.2-1.9l-1.1-6.1Z"
        />
        <path
          style={{ display: 'none' }}
          fill="currentColor"
          d="M18.1059 26.9679C19.5611 25.3437 22.1435 25.6564 24.4031 25.0293C28.3475 23.9359 34.4987 21.0656 34.3323 16.0293C34.1843 11.6362 29.9475 9.05012 24.9899 8.30196C21.4983 20.2821 15.6283 30.9484 10.0251 41.3662C8.33149 44.5212 6.66669 49.1657 2.27349 49.531C0.103891 47.6566 0.837889 44.9394 1.17389 43.002C2.16309 37.3547 4.79549 31.2331 7.10429 26.3191C10.3467 19.4013 14.8271 12.9329 19.3539 7.97759C17.3139 8.04134 16.0331 8.32601 14.5287 7.37457C13.2079 1.56691 19.2863 0.331201 23.4743 0.0709891C33.1539 -0.534435 42.9099 4.98255 42.6671 14.958C42.4703 23.0374 33.7831 28.3395 25.5723 29.0059C23.2671 29.1951 19.7159 29.483 18.1059 26.9679ZM160.142 19.7978C161.614 16.917 162.593 14.3137 164.171 10.7553C164.864 9.18724 168.771 2.02639 165.063 1.12186C165.005 1.10582 164.837 1.10101 164.78 1.12186C158.48 2.89443 153.967 14.9921 150.055 20.0079C145.245 19.8916 139.39 19.5079 139.635 23.0487C139.831 25.9387 144.049 26.5084 146.49 27.9193C145.593 30.7371 140.212 42.0173 144.802 44.9197C149.614 47.9617 152.123 40.8762 153.211 37.8956C154.574 34.1484 155.594 30.8205 157.171 27.9991C160.967 27.7253 165.155 26.4262 168.262 26.3809C167.431 29.6863 165.595 34.2919 167.58 38.562C171.104 40.8293 173.73 38.3527 174.957 36.0697C176.907 32.4371 177.201 25.9695 178.656 23.0555C180.924 21.6915 184.473 21.5339 185.026 18.5641C183.725 17.2883 181.699 18.6018 179.969 18.53C180.441 16.1484 181.631 13.6329 182.454 11.1771C183.264 8.7474 184.857 5.76839 182.923 3.23924C178.99 3.90521 177.314 7.48884 175.644 10.271C173.801 13.3394 172.327 16.6496 170.513 19.5909C167.019 19.6262 163.886 19.9979 160.142 19.7978ZM62.3831 2.06167C58.1087 0.662381 51.0579 4.02309 48.7811 7.3437C47.3191 9.47632 46.8119 13.6638 49.6403 14.4416C53.1959 15.4171 55.8819 11.3311 57.3931 9.6796C59.7051 7.15486 61.7279 5.40955 62.3831 2.06167ZM226.561 8.09988C223.083 7.19295 221.647 9.85641 219.609 12.3002C217.967 14.268 216.964 16.2511 216.024 16.5265C213.705 17.2149 210.071 15.0438 208.09 15.6184C207.422 15.8088 206.334 16.7137 206.308 17.8729C206.236 20.9044 209.909 21.3683 212.864 22.4573C211.552 25.3056 209.842 28.7898 208.925 32.6356C208.084 36.1824 207.139 41.3866 209.114 45.115C211.527 44.72 212.097 41.8461 212.906 40.0342C215.698 33.7951 218.319 27.3151 221.807 21.9565C227.291 21.5856 232.947 20.0432 237.281 18.9502C238.837 18.5617 241.053 18.7205 241.612 16.9992C240.487 15.6605 238.284 16.1312 236.486 16.1127C232.217 16.057 227.611 16.3605 224.71 16.306C225.73 14.1413 228.664 11.5143 226.561 8.09988ZM111.445 28.5111C112.481 24.2479 116.313 22.6112 120.695 21.4918C121.884 21.5431 120.181 22.7596 120.295 23.4725C120.011 24.2527 119.596 24.9058 119.664 26.016C116.947 26.8729 115.047 28.4891 111.445 28.5111ZM89.2967 32.3157C91.8515 30.0038 93.9347 27.7513 96.8371 25.0008C98.7963 23.1413 104.069 19.9393 102.553 15.9676C101.729 13.8133 97.9823 13.3647 95.3183 13.3611C91.5111 13.3579 86.6599 14.541 82.7703 14.4039C81.3951 14.355 80.1503 13.2344 79.0963 14.0932C75.5487 21.5295 86.7543 21.0371 92.2515 20.4305C88.2675 24.7426 81.2499 27.3756 77.7791 32.2311C76.8707 33.4948 75.7267 35.5084 76.5391 37.6069C78.0227 38.7917 79.7119 37.977 81.3355 37.9212C88.7075 37.6959 97.1551 40.1188 102.641 37.5203C103.763 36.9879 104.459 36.0136 105.541 35.269C112.261 37.4261 117.031 33.5967 120.949 31.4147C123.323 34.6143 133.003 34.8232 133.799 30.6598C132.27 28.0608 128.073 29.5275 127.297 26.6435C126.488 23.6601 131.58 19.374 128.4 16.1621C127.156 15.3084 125.797 16.6279 125.027 16.1336C115.397 14.9259 105.366 20.1779 102.926 27.3151C102.273 29.2043 102.74 31.6156 103.132 33.2695C99.0435 34.9651 93.7595 32.9223 89.2967 32.3157ZM50.1587 17.2815C48.8463 16.6781 48.2891 17.0826 47.6767 17.8308C43.7315 22.618 34.7551 30.0704 35.5655 37.8707C35.8595 40.6625 37.4595 44.2036 41.0459 43.0156C42.1019 42.0802 41.6759 40.8225 42.1703 39.622C45.0399 32.5867 53.3407 27.6555 50.1587 17.2815ZM76.7259 19.463C73.4871 18.3039 68.0159 19.0496 63.1971 18.7962C58.8803 18.5641 53.2527 16.9856 53.5299 20.7083C53.8559 25.1127 62.6739 24.6488 67.2903 24.2106C64.0411 27.2237 60.1951 30.1458 56.5223 33.2082C53.3143 35.8796 47.4787 39.0483 49.0719 45.058C52.6719 47.1049 56.9415 45.0476 61.6927 44.8684C70.6427 44.5372 78.2835 47.2203 86.8115 46.4758C90.1423 46.1819 95.3639 45.0669 95.1027 41.4303C93.2123 40.3173 91.6103 41.4828 89.7903 41.6757C81.0391 42.6067 72.7923 37.7099 62.8399 38.3551C65.4031 35.6824 68.7775 33.0105 71.7151 30.2007C74.3911 27.6371 78.3727 24.4066 76.7259 19.463ZM188.656 35.3211C189.795 31.9849 191.208 24.2788 186.526 23.1104C184.929 22.7131 182.731 23.1721 181.561 24.2058C181.564 25.9591 183.499 25.5926 183.505 27.3436C182.307 30.9027 177.273 37.544 181.582 41.5053C185.451 45.0649 191.801 40.7856 193.752 39.3286C195.24 38.2216 196.521 36.7208 197.735 36.5232C198.193 41.0747 199.939 44.2149 204.034 44.7906C205.247 43.4643 204.211 41.9575 204.221 40.2559C204.243 37.5488 205.169 34.4198 205.769 31.764C206.396 28.959 207.997 25.8713 205.908 23.2592C203.471 22.7175 202.442 24.7623 201.365 26.0565C197.946 30.165 194.224 33.3357 188.656 35.3211Z"
        />
      </svg>
    );
  }

  if (brand === 'mcdonalds') {
    return (
      <svg
        className="signup-proof-ticker__logo signup-proof-ticker__logo--mcdonalds"
        role="img"
        viewBox="0 0 24 24"
        aria-label={label}
      >
        <path
          fill="currentColor"
          d="M17.243 3.006c2.066 0 3.742 8.714 3.742 19.478H24c0-11.588-3.042-20.968-6.766-20.968-2.127 0-4.007 2.81-5.248 7.227-1.241-4.416-3.121-7.227-5.231-7.227C3.031 1.516 0 10.888 0 22.476h3.014c0-10.763 1.658-19.47 3.724-19.47 2.066 0 3.741 8.05 3.741 17.98h2.997c0-9.93 1.684-17.98 3.75-17.98Z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="signup-proof-ticker__logo signup-proof-ticker__logo--dominos"
      role="img"
      viewBox="18.5 18.2 162.9 163.7"
      aria-label={label}
    >
      <path
        fill="#FFFFFF"
        d="M71 70.9l49.6-49.6c3.7-3.7 7.9-4.4 12.4 0l46.1 46.1c3.3 3.3 3 8.3 0 11.3L78.8 178.9c-3.6 3.6-8.3 4.2-12.5 0l-45.1-45.1c-3.6-3.6-3.3-9.3 0-12.6L71 70.9z"
      />
      <path
        fill="#006491"
        d="M71.8 76l51.9 51.9-47.2 47.2c-2.9 2.9-5.9 3-8.9 0l-43.2-43.2c-2.7-2.7-2.5-5.7 0-8.2L71.8 76z"
      />
      <path
        fill="#E31837"
        d="M127 124.8L75.1 72.9l47.2-47.2c2.9-2.9 5.9-3 8.9 0l43.2 43.2c2.7 2.7 2.5 5.7 0 8.2L127 124.8z"
      />
      <circle fill="#FFFFFF" cx="126.7" cy="73" r="12.8" />
      <circle fill="#FFFFFF" cx="90.8" cy="127.9" r="12.8" />
      <circle fill="#FFFFFF" cx="53.4" cy="127.9" r="12.8" />
    </svg>
  );
};

interface LoginPhoneProps {
  error?: string;
  isSubmitting?: boolean;
  mode: LoginPhoneMode;
  onSubmit: (phone: string) => void;
}

export const LoginPhone: React.FC<LoginPhoneProps> = ({
  error,
  isSubmitting = false,
  mode,
  onSubmit,
}) => {
  const [phone, setPhone] = useState('');

  const canSubmit = !isSubmitting;
  const isSignup = mode === 'signup';
  const title = isSignup ? 'הרשמה לסנדי' : 'כניסה לסנדי';
  const submitText = 'שלח קוד אימות';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10 && canSubmit) {
      onSubmit(phone);
    }
  };

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.setCustomValidity('');
    setPhone(event.target.value.replace(/\D/g, '').slice(0, 10));
  };

  const handlePhoneInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    input.setCustomValidity(
      input.value
        ? 'צריך להזין מספר טלפון תקין בן 10 ספרות'
        : 'צריך להזין מספר טלפון',
    );
  };

  return (
    <section className="w-full max-w-[320px] text-center" dir="rtl" aria-label={title}>
      <h1 className="mb-7 text-3xl font-extrabold text-[#0d0d12] dark:text-app-text sm:text-[32px]">
        {title}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="sr-only" htmlFor="login-phone-number">
          מספר טלפון
        </label>
        <input
          id="login-phone-number"
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          onInvalid={handlePhoneInvalid}
          placeholder="0501234567"
          className="h-12 w-full rounded-lg border border-[#d8d8d8] bg-white px-3 text-left text-sm font-medium text-[#0d0d12] outline-none transition-colors placeholder:text-[#777] hover:border-[#bdbdbd] focus:border-[#0d0d12] focus:bg-white focus:ring-2 focus:ring-[#0d0d12]/10 dark:border-[#252525] dark:bg-[#050505] dark:text-app-text dark:placeholder:text-[#777] dark:hover:border-[#3a3a3a] dark:hover:bg-[#080808] dark:focus:border-[#ededed] dark:focus:ring-[#ededed]/10"
          required
          pattern="[0-9]{10}"
          maxLength={10}
          dir="ltr"
          autoComplete="tel"
          inputMode="tel"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-[#0d0d12] px-4 text-sm font-bold text-white transition-colors hover:bg-[#24242b] active:bg-[#050505] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#ededed] dark:text-[#050505] dark:hover:bg-white dark:active:bg-[#d8d8d8]"
        >
          {isSubmitting ? 'שולח קוד...' : submitText}
        </button>
      </form>

      {isSignup ? (
        <div className="signup-proof-ticker mt-5" aria-label="נתוני משלוחים לדוגמה">
          <div className="signup-proof-ticker__track" aria-hidden="true">
            {SIGNUP_PROOF_ITEMS.map((item) => (
              <div className="signup-proof-ticker__item" key={`${item.brandLabel}-${item.highlight}`}>
                <SignupProofLogo brand={item.brand} label={item.brandLabel} />
                <strong className="signup-proof-ticker__brand">{item.brandLabel}</strong>
                <span className="signup-proof-ticker__muted">{item.mutedBefore}</span>
                <span className="signup-proof-ticker__highlight">{item.highlight}</span>
                <span className="signup-proof-ticker__muted">{item.mutedAfter}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error && (
        <div className="mt-4 rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-right text-sm font-medium text-[#c00] dark:border-[#4a1f1f] dark:bg-[#2a1414] dark:text-[#ffb4b4]">
          {error}
        </div>
      )}
    </section>
  );
};
