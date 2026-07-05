// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateClientId() {
  return `ACB-CLIENT-${Math.floor(100000 + Math.random() * 900000)}`;
}

function generateIban(accountNumber: string) {
  const digits = accountNumber.replace(/\D/g, "").slice(0, 10);
  return `GB29ATCB${digits.padEnd(10, "0")}`;
}

await supabaseAdmin.from("notifications").insert({
  profile_id: userData.user.id,
  title: "Welcome to Atlas Capital Bank",
  message: "Your private banking account has been successfully created.",
  type: "account",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const {
      full_name,
      email,
      password,
      virtual_balance,
      access_expires_at,
      phone,
      address,
      country,
      date_of_birth,
      occupation,
      id_type,
      id_number,
      profile_image_url,

      client_id,
      account_tier,
      account_type,
      swift_code,
      iban,
      available_credit,
      investment_balance,
      pending_transfers,
      transfer_limit,

      banking_country,
      banking_currency,
      assigned_bank,
      assigned_beneficiary_name,
      assigned_beneficiary_account,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase function secrets");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const accountNumber = `ACB${Math.floor(
      1000000000 + Math.random() * 9000000000
    )}`;

    const finalClientId = client_id || generateClientId();
    const finalSwiftCode = swift_code || "ATCBUS33";
    const finalIban = iban || generateIban(accountNumber);

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          phone,
          profile_image_url,
        },
      });

    if (userError) throw userError;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userData.user.id,
        full_name,
        email,
        role: "user",
        account_number: accountNumber,
        virtual_balance: Number(virtual_balance || 0),
        transaction_count: 0,
        transfer_limit: Number(transfer_limit || 2),
        status: "active",
        access_expires_at: access_expires_at || null,

        phone: phone || null,
        address: address || null,
        country: country || null,
        date_of_birth: date_of_birth || null,
        occupation: occupation || null,
        id_type: id_type || null,
        id_number: id_number || null,
        profile_image_url: profile_image_url || null,

        client_id: finalClientId,
        account_tier: account_tier || "Private Banking",
        account_type: account_type || "Global Checking Account",
        swift_code: finalSwiftCode,
        iban: finalIban,
        available_credit: Number(available_credit || 0),
        investment_balance: Number(investment_balance || 0),
        pending_transfers: Number(pending_transfers || 0),

        banking_country: banking_country || null,
        banking_currency: banking_currency || null,
        assigned_bank: assigned_bank || null,
        assigned_beneficiary_name: assigned_beneficiary_name || null,
        assigned_beneficiary_account: assigned_beneficiary_account || null,
      });

    if (profileError) throw profileError;

      await supabaseAdmin.from("notifications").insert({
      profile_id: userData.user.id,
      title: "Welcome to Atlas Capital Bank",
      message: "Your private banking account has been successfully created.",
      type: "account",
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user.id,
        account_number: accountNumber,
        client_id: finalClientId,
        iban: finalIban,
        swift_code: finalSwiftCode,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || String(error),
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});