import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

interface SendReminderRequest {
  phone: string;
  appointmentId: string;
  messageType?: "confirmation" | "reminder_24h" | "reminder_1h" | "cancellation" | "reschedule";
  appointmentDetails?: {
    patientName?: string;
    doctorName?: string;
    date?: string;
    time?: string;
    department?: string;
  };
}

interface TwilioResponse {
  sid: string;
  status: string;
  [key: string]: any;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Twilio credentials from environment
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

/**
 * Generate message content based on message type
 */
function generateMessageContent(
  messageType: string,
  appointmentDetails: any
): string {
  const { patientName, doctorName, date, time, department } = appointmentDetails;

  const messages: { [key: string]: string } = {
    confirmation: `Appointment Confirmed! Dr. ${doctorName} on ${date} at ${time} (${department}). Reply STOP to unsubscribe.`,
    reminder_24h: `Reminder: Your appointment with Dr. ${doctorName} is tomorrow at ${time}. See you soon!`,
    reminder_1h: `Reminder: Your appointment with Dr. ${doctorName} is in 1 hour at ${time}. Please arrive 10 minutes early.`,
    cancellation: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled. Please contact the clinic for more information.`,
    reschedule: `Your appointment has been rescheduled to ${date} at ${time} with Dr. ${doctorName}. Please confirm by replying YES.`,
  };

  return messages[messageType] || messages["confirmation"];
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(
  toPhone: string,
  messageContent: string
): Promise<{ sid?: string; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return {
      error: "Twilio credentials not configured in environment variables",
    };
  }

  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  try {
    const formData = new URLSearchParams();
    formData.append("From", twilioPhoneNumber);
    formData.append("To", toPhone);
    formData.append("Body", messageContent);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Twilio API error: ${response.status} - ${errorText}` };
    }

    const data = (await response.json()) as TwilioResponse;
    return { sid: data.sid };
  } catch (error) {
    return { error: `Failed to send SMS: ${String(error)}` };
  }
}

/**
 * Log SMS attempt to database
 */
async function logSmsAttempt(
  appointmentId: string,
  patientId: string,
  phone: string,
  messageType: string,
  messageContent: string,
  twilioSid?: string,
  error?: string
) {
  try {
    const { error: dbError } = await supabase.from("appointment_sms_logs").insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      phone_number: phone,
      message_type: messageType,
      message_content: messageContent,
      twilio_message_sid: twilioSid || null,
      status: error ? "failed" : "sent",
      error_message: error || null,
      sent_at: error ? null : new Date().toISOString(),
    });

    if (dbError) {
      console.error("Error logging SMS attempt:", dbError);
    }
  } catch (error) {
    console.error("Exception while logging SMS:", error);
  }
}

/**
 * Main handler function
 */
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: SendReminderRequest = await req.json();

    if (!body.phone || !body.appointmentId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: phone, appointmentId",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const messageType = body.messageType || "confirmation";
    const messageContent = generateMessageContent(
      messageType,
      body.appointmentDetails || {}
    );

    console.log(`Sending ${messageType} SMS to ${body.phone}`);

    // Send SMS via Twilio
    const twilioResult = await sendViaTwilio(body.phone, messageContent);

    // Get patient ID for logging
    let patientId = "";
    if (body.appointmentDetails) {
      // Try to get patient ID from appointment
      const { data: apt, error: aptError } = await supabase
        .from("appointments")
        .select("patient_id")
        .eq("id", body.appointmentId)
        .single();

      if (!aptError && apt) {
        patientId = apt.patient_id;
      }
    }

    // Log the attempt
    await logSmsAttempt(
      body.appointmentId,
      patientId,
      body.phone,
      messageType,
      messageContent,
      twilioResult.sid,
      twilioResult.error
    );

    if (twilioResult.error) {
      console.error("Twilio error:", twilioResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: twilioResult.error,
          message: "SMS sending failed but was logged",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS sent successfully",
        messageSid: twilioResult.sid,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error in send-appointment-reminder function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
