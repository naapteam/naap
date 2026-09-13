CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"mill_id" uuid,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"role" text NOT NULL,
	"pin_hash" text,
	"locale" text DEFAULT 'hi' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mill_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_doc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"number" text,
	"issued_on" date,
	"expires_on" date,
	"reminder_days" integer[] DEFAULT '{60,30,7}' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"kind" text DEFAULT 'sawing' NOT NULL,
	"lot_id" uuid,
	"predicted_output_low" numeric(12, 4),
	"predicted_output_high" numeric(12, 4),
	"predicted_offcut" numeric(12, 4),
	"predicted_byproduct" numeric(12, 4),
	"predicted_waste" numeric(12, 4),
	"prediction_basis" jsonb,
	"input_cft" numeric(14, 4),
	"output_cft" numeric(14, 4),
	"recovery_pct" numeric(6, 3),
	"variance_reason" text,
	"variance_note" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"auto_accepted" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversion_input" (
	"conversion_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"quantity_consumed" numeric(12, 3) NOT NULL,
	"cft_consumed" numeric(12, 4) NOT NULL,
	CONSTRAINT "conversion_input_conversion_id_piece_id_pk" PRIMARY KEY("conversion_id","piece_id")
);
--> statement-breakpoint
CREATE TABLE "conversion_output" (
	"conversion_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	CONSTRAINT "conversion_output_conversion_id_piece_id_pk" PRIMARY KEY("conversion_id","piece_id")
);
--> statement-breakpoint
CREATE TABLE "conversion_target" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversion_id" uuid NOT NULL,
	"thickness_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"length_mm" integer NOT NULL,
	"target_quantity" numeric(12, 3),
	"predicted_quantity" numeric(12, 3),
	"actual_quantity" numeric(12, 3)
);
--> statement-breakpoint
CREATE TABLE "despatch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"customer_id" uuid,
	"vehicle_no" text,
	"challan_no" text,
	"tp_number" text,
	"total_cft" numeric(12, 4) DEFAULT '0' NOT NULL,
	"dispatched_at" timestamp with time zone NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'done' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "despatch_line" (
	"despatch_id" uuid NOT NULL,
	"piece_id" uuid NOT NULL,
	"cft" numeric(12, 4) NOT NULL,
	CONSTRAINT "despatch_line_despatch_id_piece_id_pk" PRIMARY KEY("despatch_id","piece_id")
);
--> statement-breakpoint
CREATE TABLE "grade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"code" text NOT NULL,
	"labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rank" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"supplier_id" uuid,
	"vehicle_no" text,
	"tp_number" text,
	"tp_expiry" date,
	"declared_pieces" integer,
	"declared_cft" numeric(12, 3),
	"tallied_pieces" integer DEFAULT 0 NOT NULL,
	"tallied_cft" numeric(12, 3) DEFAULT '0' NOT NULL,
	"variance_note" text,
	"defects" text[] DEFAULT '{}' NOT NULL,
	"arrived_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"code" text NOT NULL,
	"kind" text DEFAULT 'yard' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"intake_id" uuid,
	"code" text NOT NULL,
	"species_id" uuid NOT NULL,
	"grade_id" uuid
);
--> statement-breakpoint
CREATE TABLE "mill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"default_locale" text DEFAULT 'hi' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"place" text,
	"commission_pct" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "piece" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"lot_id" uuid,
	"form" text NOT NULL,
	"purpose" text NOT NULL,
	"species_id" uuid NOT NULL,
	"grade_id" uuid,
	"girth_mm" integer,
	"length_mm" integer,
	"thickness_mm" integer,
	"width_mm" integer,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"uom" text DEFAULT 'piece' NOT NULL,
	"volume_cft" numeric(12, 4) NOT NULL,
	"volume_convention" text NOT NULL,
	"location_id" uuid,
	"status" text DEFAULT 'free' NOT NULL,
	"is_bulk" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text
);
--> statement-breakpoint
CREATE TABLE "secure_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "size_preset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"thickness_mm" integer NOT NULL,
	"width_mm" integer NOT NULL,
	"length_mm" integer NOT NULL,
	"label" text,
	"use_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mill_id" uuid NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text,
	"name_mr" text,
	"name_gu" text,
	"colour_hex" text NOT NULL,
	"default_convention" text DEFAULT 'hoppus' NOT NULL,
	"recovery_low" numeric(5, 2) NOT NULL,
	"recovery_high" numeric(5, 2) NOT NULL,
	"byproduct_pct" numeric(5, 2) DEFAULT '18' NOT NULL,
	"min_offcut_length_mm" integer DEFAULT 450 NOT NULL,
	"min_offcut_width_mm" integer DEFAULT 50 NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_doc" ADD CONSTRAINT "compliance_doc_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion" ADD CONSTRAINT "conversion_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion" ADD CONSTRAINT "conversion_lot_id_lot_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion" ADD CONSTRAINT "conversion_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion" ADD CONSTRAINT "conversion_confirmed_by_app_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_input" ADD CONSTRAINT "conversion_input_conversion_id_conversion_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."conversion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_input" ADD CONSTRAINT "conversion_input_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_output" ADD CONSTRAINT "conversion_output_conversion_id_conversion_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."conversion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_output" ADD CONSTRAINT "conversion_output_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_target" ADD CONSTRAINT "conversion_target_conversion_id_conversion_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."conversion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despatch" ADD CONSTRAINT "despatch_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despatch" ADD CONSTRAINT "despatch_customer_id_party_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despatch" ADD CONSTRAINT "despatch_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despatch_line" ADD CONSTRAINT "despatch_line_despatch_id_despatch_id_fk" FOREIGN KEY ("despatch_id") REFERENCES "public"."despatch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despatch_line" ADD CONSTRAINT "despatch_line_piece_id_piece_id_fk" FOREIGN KEY ("piece_id") REFERENCES "public"."piece"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade" ADD CONSTRAINT "grade_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake" ADD CONSTRAINT "intake_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake" ADD CONSTRAINT "intake_supplier_id_party_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."party"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake" ADD CONSTRAINT "intake_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot" ADD CONSTRAINT "lot_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot" ADD CONSTRAINT "lot_intake_id_intake_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."intake"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot" ADD CONSTRAINT "lot_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lot" ADD CONSTRAINT "lot_grade_id_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mill" ADD CONSTRAINT "mill_org_id_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."org"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party" ADD CONSTRAINT "party_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece" ADD CONSTRAINT "piece_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece" ADD CONSTRAINT "piece_lot_id_lot_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece" ADD CONSTRAINT "piece_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece" ADD CONSTRAINT "piece_grade_id_grade_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."grade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece" ADD CONSTRAINT "piece_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "piece" ADD CONSTRAINT "piece_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secure_note" ADD CONSTRAINT "secure_note_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_preset" ADD CONSTRAINT "size_preset_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_mill_id_mill_id_fk" FOREIGN KEY ("mill_id") REFERENCES "public"."mill"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "location_mill_code_uq" ON "location" USING btree ("mill_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "lot_mill_code_uq" ON "lot" USING btree ("mill_id","code");--> statement-breakpoint
CREATE INDEX "piece_mill_form_status_idx" ON "piece" USING btree ("mill_id","form","status");--> statement-breakpoint
CREATE INDEX "piece_mill_lot_idx" ON "piece" USING btree ("mill_id","lot_id");--> statement-breakpoint
CREATE INDEX "piece_offcut_match_idx" ON "piece" USING btree ("mill_id","species_id","thickness_mm","width_mm","length_mm") WHERE "piece"."purpose" = 'offcut' AND "piece"."status" = 'free';--> statement-breakpoint
CREATE UNIQUE INDEX "secure_note_entity_uq" ON "secure_note" USING btree ("entity_table","entity_id");