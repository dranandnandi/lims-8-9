# Current Database Schema

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

```sql
CREATE TABLE public.ai_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_id uuid,
  analyte_id uuid,
  lab_id uuid,
  ai_processing_type character varying NOT NULL,
  prompt text NOT NULL,
  default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_prompts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ai_prompts_lab FOREIGN KEY (lab_id) REFERENCES public.labs(id),
  CONSTRAINT fk_ai_prompts_test_group FOREIGN KEY (test_id) REFERENCES public.test_groups(id),
  CONSTRAINT fk_ai_prompts_analyte FOREIGN KEY (analyte_id) REFERENCES public.analytes(id)
);

CREATE TABLE public.ai_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  lab_id uuid,
  processing_type character varying NOT NULL,
  input_data jsonb,
  confidence numeric,
  tokens_used integer,
  processing_time_ms integer,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT ai_usage_logs_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id)
);

CREATE TABLE public.analytes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  unit character varying NOT NULL,
  reference_range text NOT NULL,
  low_critical character varying,
  high_critical character varying,
  interpretation_low text,
  interpretation_normal text,
  interpretation_high text,
  category character varying NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  ai_processing_type text DEFAULT 'ocr_report'::text CHECK ((ai_processing_type = ANY (ARRAY['ocr_report'::text, 'vision_card'::text, 'vision_color'::text, 'none'::text])) OR ai_processing_type IS NULL),
  ai_prompt_override text,
  group_ai_mode USER-DEFINED DEFAULT 'individual'::group_ai_mode,
  is_global boolean DEFAULT true,
  to_be_copied boolean DEFAULT false,
  CONSTRAINT analytes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  related_table text NOT NULL,
  related_id uuid NOT NULL,
  file_url text NOT NULL,
  file_type text,
  description text,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  lab_id uuid,
  file_path text,
  original_filename text,
  stored_filename text,
  file_size bigint,
  upload_timestamp timestamp with time zone DEFAULT now(),
  ai_processed boolean DEFAULT false,
  ai_confidence numeric,
  processing_status text CHECK (processing_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text])),
  ai_processed_at timestamp without time zone,
  ai_processing_type text,
  ai_metadata jsonb,
  CONSTRAINT attachments_pkey PRIMARY KEY (id),
  CONSTRAINT attachments_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id),
  CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id),
  CONSTRAINT attachments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name character varying NOT NULL,
  record_id uuid NOT NULL,
  action character varying NOT NULL,
  old_values jsonb,
  new_values jsonb,
  user_id uuid,
  user_email character varying,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  code character varying NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  test_name character varying NOT NULL,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);

CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  order_id uuid,
  patient_name character varying NOT NULL,
  subtotal numeric NOT NULL CHECK (subtotal >= 0::numeric),
  discount numeric DEFAULT 0 CHECK (discount >= 0::numeric),
  tax numeric NOT NULL CHECK (tax >= 0::numeric),
  total numeric NOT NULL CHECK (total >= 0::numeric),
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::invoice_status,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  payment_method character varying,
  payment_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);

CREATE TABLE public.lab_analytes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  analyte_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  visible boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  lab_specific_reference_range text,
  lab_specific_interpretation_low text,
  lab_specific_interpretation_normal text,
  lab_specific_interpretation_high text,
  CONSTRAINT lab_analytes_pkey PRIMARY KEY (id),
  CONSTRAINT lab_analytes_analyte_id_fkey FOREIGN KEY (analyte_id) REFERENCES public.analytes(id),
  CONSTRAINT lab_analytes_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id)
);

CREATE TABLE public.labs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  code character varying NOT NULL UNIQUE,
  address text,
  city character varying,
  state character varying,
  pincode character varying,
  phone character varying,
  email character varying,
  license_number character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT labs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.ocr_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attachment_id uuid,
  raw_text text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT ocr_results_pkey PRIMARY KEY (id),
  CONSTRAINT ocr_results_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id)
);

CREATE TABLE public.order_test_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  test_group_id uuid NOT NULL,
  test_name character varying NOT NULL,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_test_groups_pkey PRIMARY KEY (id),
  CONSTRAINT order_test_groups_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_test_groups_test_group_id_fkey FOREIGN KEY (test_group_id) REFERENCES public.test_groups(id)
);

CREATE TABLE public.order_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  test_name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_tests_pkey PRIMARY KEY (id),
  CONSTRAINT order_tests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  patient_name character varying NOT NULL,
  priority USER-DEFINED NOT NULL DEFAULT 'Normal'::priority_type,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount >= 0::numeric),
  doctor character varying NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  parent_order_id uuid,
  order_type character varying DEFAULT 'initial'::character varying,
  visit_group_id character varying,
  addition_reason text,
  can_add_tests boolean DEFAULT true,
  locked_at timestamp with time zone,
  created_by uuid,
  status_updated_at timestamp with time zone,
  status_updated_by character varying,
  delivered_at timestamp with time zone,
  delivered_by character varying,
  color_code text,
  color_name text,
  qr_code_data text,
  lab_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'Order Created'::order_status,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT orders_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT orders_parent_order_id_fkey FOREIGN KEY (parent_order_id) REFERENCES public.orders(id),
  CONSTRAINT orders_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id)
);

CREATE TABLE public.package_test_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  test_group_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT package_test_groups_pkey PRIMARY KEY (id),
  CONSTRAINT package_test_groups_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT package_test_groups_test_group_id_fkey FOREIGN KEY (test_group_id) REFERENCES public.test_groups(id)
);

CREATE TABLE public.packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  discount_percentage numeric DEFAULT 0 CHECK (discount_percentage >= 0::numeric AND discount_percentage <= 100::numeric),
  category character varying NOT NULL,
  validity_days integer DEFAULT 30 CHECK (validity_days > 0),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  lab_id uuid,
  CONSTRAINT packages_pkey PRIMARY KEY (id),
  CONSTRAINT packages_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id)
);

CREATE TABLE public.patient_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  order_id uuid,
  activity_type character varying NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  performed_by uuid,
  performed_at timestamp with time zone DEFAULT now(),
  lab_id uuid,
  CONSTRAINT patient_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT patient_activity_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT patient_activity_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT patient_activity_log_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id),
  CONSTRAINT patient_activity_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id)
);

CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  age integer NOT NULL CHECK (age >= 0 AND age <= 150),
  gender USER-DEFINED NOT NULL,
  phone character varying NOT NULL,
  email character varying,
  address text NOT NULL,
  city character varying NOT NULL,
  state character varying NOT NULL,
  pincode character varying NOT NULL,
  emergency_contact character varying,
  emergency_phone character varying,
  blood_group USER-DEFINED,
  allergies text,
  medical_history text,
  registration_date date NOT NULL DEFAULT CURRENT_DATE,
  last_visit date NOT NULL DEFAULT CURRENT_DATE,
  total_tests integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  external_patient_id character varying,
  display_id character varying,
  referring_doctor character varying,
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  payment_reference text,
  payment_date date DEFAULT CURRENT_DATE,
  received_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id),
  CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
);

CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  result_id uuid,
  generated_date timestamp with time zone DEFAULT now(),
  status character varying DEFAULT 'pending'::character varying,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  doctor character varying NOT NULL DEFAULT ''::character varying,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT fk_reports_result FOREIGN KEY (result_id) REFERENCES public.results(id),
  CONSTRAINT fk_reports_patient FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);

CREATE TABLE public.result_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL,
  analyte_id uuid,
  parameter character varying NOT NULL,
  value character varying NOT NULL,
  unit character varying NOT NULL,
  reference_range text NOT NULL,
  flag character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT result_values_pkey PRIMARY KEY (id),
  CONSTRAINT result_values_analyte_id_fkey FOREIGN KEY (analyte_id) REFERENCES public.analytes(id),
  CONSTRAINT result_values_result_id_fkey FOREIGN KEY (result_id) REFERENCES public.results(id)
);

CREATE TABLE public.results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  patient_name character varying NOT NULL,
  test_name character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Entered'::result_status,
  entered_by character varying NOT NULL,
  entered_date date NOT NULL DEFAULT CURRENT_DATE,
  reviewed_by character varying,
  reviewed_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  extracted_by_ai boolean DEFAULT false,
  ai_confidence numeric,
  manually_verified boolean DEFAULT false,
  ai_extraction_metadata jsonb,
  attachment_id uuid,
  CONSTRAINT results_pkey PRIMARY KEY (id),
  CONSTRAINT results_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(id),
  CONSTRAINT results_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT results_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.test_group_analytes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  test_group_id uuid NOT NULL,
  analyte_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT test_group_analytes_pkey PRIMARY KEY (id),
  CONSTRAINT test_group_analytes_analyte_id_fkey FOREIGN KEY (analyte_id) REFERENCES public.analytes(id),
  CONSTRAINT test_group_analytes_test_group_id_fkey FOREIGN KEY (test_group_id) REFERENCES public.test_groups(id)
);

CREATE TABLE public.test_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  code character varying NOT NULL UNIQUE,
  category character varying NOT NULL,
  clinical_purpose text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  turnaround_time character varying NOT NULL,
  sample_type USER-DEFINED NOT NULL,
  requires_fasting boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  default_ai_processing_type character varying DEFAULT 'ocr_report'::character varying,
  group_level_prompt text,
  lab_id uuid,
  to_be_copied boolean DEFAULT false,
  CONSTRAINT test_groups_pkey PRIMARY KEY (id),
  CONSTRAINT test_groups_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id)
);

CREATE TABLE public.tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  category character varying NOT NULL,
  method character varying NOT NULL,
  sample_type USER-DEFINED NOT NULL,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  turnaround_time character varying NOT NULL,
  reference_range text NOT NULL,
  units character varying,
  description text,
  is_active boolean DEFAULT true,
  requires_fasting boolean DEFAULT false,
  critical_values text,
  interpretation text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tests_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL,
  department character varying,
  status USER-DEFINED NOT NULL DEFAULT 'Active'::user_status,
  phone character varying,
  join_date date NOT NULL DEFAULT CURRENT_DATE,
  last_login timestamp with time zone,
  permissions ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  department_id uuid,
  lab_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT users_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id)
);
```

## Key Observations:

1. **Orders table already has sample tracking fields**: The `orders` table already contains `color_code`, `color_name`, and `qr_code_data` columns.

2. **Patients table does NOT have sample tracking fields**: The `patients` table does not contain the `qr_code_data`, `color_code`, `color_name`, or `display_id` columns that the migration was trying to reference.

3. **Current Architecture**: The system is already partially migrated to order-based sample tracking, so we mainly need to ensure all orders have proper sample data.

## Migration Strategy:
The migration should focus on:
- Adding missing sample tracking columns to orders table (if not already present)
- Generating sample data for existing orders that lack it
- Creating proper indexes and constraints
- Building supporting views for daily sample management
