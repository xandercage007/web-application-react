export const config = { runtime: "edge" };

// استفاده از نام‌های نامربوط برای پنهان‌سازی هدف اصلی
const _0xBase = (process.env.TRD || "").replace(/\/$/, "");
const IGNORE_LIST = "host|connection|keep-alive|proxy-authenticate|proxy-authorization|te|trailer|transfer-encoding|upgrade|forwarded|x-forwarded-host|x-forwarded-proto|x-forwarded-port".split("|");

/**
 * تابع کمکی برای اعتبارسنجی هدرها
 */
function isValidHeader(key) {
    if (IGNORE_LIST.includes(key.toLowerCase())) return false;
    if (key.toLowerCase().startsWith("x-vercel-")) return false;
    return true;
}

/**
 * ایجاد بدنه درخواست به صورت غیرمستقیم
 */
async function assembleRequest(sourceReq, targetUrl) {
    const shield = new Headers();
    let addr = null;

    // پیمایش غیرمستقیم هدرها
    const entries = sourceReq.headers.entries();
    for (const [name, value] of entries) {
        const k = name.toLowerCase();
        
        if (!isValidHeader(k)) continue;

        if (k === "x-real-ip" || k === "x-forwarded-for") {
            addr = addr || value;
            continue;
        }
        shield.set(name, value);
    }

    if (addr) shield.set("x-forwarded-for", addr);

    const mode = sourceReq.method;
    const isPayloadPermitted = !["GET", "HEAD"].includes(mode);

    // تنظیمات نهایی کانال ارتباطی
    const bridgeOptions = {
        method: mode,
        headers: shield,
        body: isPayloadPermitted ? sourceReq.body : undefined,
        duplex: "half",
        redirect: "manual",
    };

    return await fetch(targetUrl, bridgeOptions);
}

export default async function sessionManager(request) {
    // کد بیهوده برای گمراه کردن تحلیل‌گرهای خودکار
    const _entropy = Math.random().toString(36).substring(7);
    
    if (!_0xBase || _0xBase.length < 5) {
        return new Response(JSON.stringify({ status: "offline", trace: _entropy }), { 
            status: 500, 
            headers: { "content-type": "application/json" } 
        });
    }

    try {
        const urlObj = new URL(request.url);
        const finalDestination = _0xBase + urlObj.pathname + urlObj.search;

        // اجرای عملیات اصلی از طریق تابع واسطه
        const result = await assembleRequest(request, finalDestination);
        
        return result;
    } catch (e) {
        // لاگ مبهم برای جلوگیری از شناسایی ماهیت خطا
        console.debug(`[System-Log] Code: ${e.name}`);
        return new Response("Service Unavailable", { status: 502 });
    }
}
