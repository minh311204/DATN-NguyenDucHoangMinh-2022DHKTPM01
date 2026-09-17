"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useCallback, useEffect, useRef } from "react";
import { postOAuthFacebook, postOAuthGoogle } from "@/lib/client-auth";
import { errorMessage } from "@/lib/format";

const OAUTH_PILL_CLASS =
  "relative flex h-12 w-full shrink-0 items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white px-5 text-[15px] font-medium text-slate-900 transition-colors hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-60";

function FacebookGlyph() {
  return (
    <svg
      className="h-[22px] w-[22px] shrink-0 text-[#1877F2]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/** Logo G nhiều màu (Google brand) */
function GoogleGlyph() {
  return (
    <svg
      className="h-[22px] w-[22px] shrink-0"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function buildFacebookOAuthUrl(appId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: "email,public_profile",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

type OAuthSocialSectionProps = {
  dividerLabel?: string;
  facebookOAuthReturnPath?: string;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setErr: (msg: string | null) => void;
  onOAuthSuccess: (accessToken: string, refreshToken: string) => Promise<void>;
};

function GooglePillWithOverlay(props: {
  disabled: boolean;
  setErr: OAuthSocialSectionProps["setErr"];
  setLoading: OAuthSocialSectionProps["setLoading"];
  onOAuthSuccess: OAuthSocialSectionProps["onOAuthSuccess"];
}) {
  const { disabled, setErr, setLoading, onOAuthSuccess } = props;

  const handleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setErr("Google không trả token. Thử lại.");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await postOAuthGoogle(idToken);
      if (res.ok) {
        await onOAuthSuccess(res.data.accessToken, res.data.refreshToken);
        return;
      }
      setErr(errorMessage(res.body));
    } catch {
      setErr("Không kết nối được API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`${OAUTH_PILL_CLASS} relative z-0 isolate overflow-hidden p-0`}
    >
      {/* Lớp hiển thị (ảnh tham khảo) */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 rounded-full border border-transparent">
        <GoogleGlyph />
        <span>Tiếp tục với Google</span>
      </div>
      {/* Nút GIS trong suốt, vẫn nhận click — backend vẫn dùng id_token */}
      <div className="absolute inset-0 z-20 flex items-stretch [&>div]:!flex [&>div]:!h-full [&>div]:!w-full [&_iframe]:!min-h-[3rem]">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setErr("Đăng nhập Google thất bại.")}
          theme="outline"
          size="large"
          text="signin_with"
          shape="pill"
          width="100%"
          containerProps={{
            className:
              "!m-0 !flex min-h-[3rem] w-full max-w-none items-stretch opacity-[0.02]",
            style: { minHeight: "3rem", width: "100%" },
          }}
        />
      </div>
      {disabled ? (
        <div className="absolute inset-0 z-30 cursor-not-allowed rounded-full bg-white/60" />
      ) : null}
    </div>
  );
}

export function OAuthSocialSection({
  dividerLabel = "Hoặc đăng nhập nhanh",
  facebookOAuthReturnPath = "/login",
  loading,
  setLoading,
  setErr,
  onOAuthSuccess,
}: OAuthSocialSectionProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";
  const fbNavigatingRef = useRef(false);

  useEffect(() => {
    if (!fbAppId || typeof window === "undefined") return;

    const raw = window.location.hash.replace(/^#/, "");
    if (!raw.includes("access_token=") && !raw.includes("error=")) return;

    const params = new URLSearchParams(raw);
    const accessToken = params.get("access_token");
    const oauthError = params.get("error");

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    if (oauthError) {
      const desc = params.get("error_description");
      setErr(
        desc
          ? decodeURIComponent(desc.replace(/\+/g, " "))
          : "Đăng nhập Facebook bị hủy hoặc từ chối.",
      );
      return;
    }

    if (!accessToken) return;

    setLoading(true);
    void (async () => {
      try {
        const res = await postOAuthFacebook(accessToken);
        if (res.ok) {
          await onOAuthSuccess(res.data.accessToken, res.data.refreshToken);
          return;
        }
        setErr(errorMessage(res.body));
      } catch {
        setErr("Không kết nối được API.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fbAppId, onOAuthSuccess, setErr, setLoading]);

  const onFacebookClick = useCallback(() => {
    if (!fbAppId || loading || fbNavigatingRef.current) return;
    fbNavigatingRef.current = true;
    setErr(null);
    const path = facebookOAuthReturnPath.startsWith("/")
      ? facebookOAuthReturnPath
      : `/${facebookOAuthReturnPath}`;
    const redirectUri = `${window.location.origin}${path}`;
    const url = buildFacebookOAuthUrl(fbAppId, redirectUri);
    window.location.assign(url);
  }, [fbAppId, facebookOAuthReturnPath, loading, setErr]);

  const hasPublicKeys = Boolean(googleClientId || fbAppId);

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-center text-sm font-medium text-slate-600">
        {dividerLabel}
      </p>
      {hasPublicKeys ? (
        <div className="isolate mt-4 flex w-full flex-col gap-3">
          {fbAppId ? (
            <button
              type="button"
              disabled={loading}
              onClick={onFacebookClick}
              className={`${OAUTH_PILL_CLASS} relative z-[2] cursor-pointer touch-manipulation select-none active:scale-[0.99] active:bg-zinc-100`}
            >
              <span className="pointer-events-none flex items-center justify-center gap-3">
                <FacebookGlyph />
                <span>Tiếp tục với Facebook</span>
              </span>
            </button>
          ) : null}
          {googleClientId ? (
            <GooglePillWithOverlay
              disabled={loading}
              setErr={setErr}
              setLoading={setLoading}
              onOAuthSuccess={onOAuthSuccess}
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs leading-relaxed text-slate-600">
          Bật Google/Facebook: trong{" "}
          <span className="font-mono text-slate-800">src/user/.env.local</span>{" "}
          đặt{" "}
          <span className="font-mono text-slate-800">
            NEXT_PUBLIC_GOOGLE_CLIENT_ID
          </span>{" "}
          và/hoặc{" "}
          <span className="font-mono text-slate-800">
            NEXT_PUBLIC_FACEBOOK_APP_ID
          </span>
          ; API cần{" "}
          <span className="font-mono text-slate-800">GOOGLE_CLIENT_ID</span>,{" "}
          <span className="font-mono text-slate-800">FACEBOOK_APP_ID</span>,{" "}
          <span className="font-mono text-slate-800">FACEBOOK_APP_SECRET</span>.
          Với Facebook, thêm{" "}
          <span className="font-mono text-slate-800">
            Valid OAuth Redirect URIs
          </span>{" "}
          (Meta):{" "}
          <span className="font-mono text-slate-800">
            http://localhost:3000/login
          </span>
          và{" "}
          <span className="font-mono text-slate-800">
            http://localhost:3000/register
          </span>
          .
        </p>
      )}
    </div>
  );
}
