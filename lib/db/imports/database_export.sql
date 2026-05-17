--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.tables DROP CONSTRAINT IF EXISTS tables_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.tables DROP CONSTRAINT IF EXISTS tables_area_id_areas_id_fk;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_entry_items DROP CONSTRAINT IF EXISTS stock_entry_items_stock_entry_id_stock_entries_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_entry_items DROP CONSTRAINT IF EXISTS stock_entry_items_inventory_item_id_inventory_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_entries DROP CONSTRAINT IF EXISTS stock_entries_supplier_id_suppliers_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_entries DROP CONSTRAINT IF EXISTS stock_entries_received_by_staff_id_staff_id_fk;
ALTER TABLE IF EXISTS ONLY public.stock_entries DROP CONSTRAINT IF EXISTS stock_entries_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.staff DROP CONSTRAINT IF EXISTS staff_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.recipes DROP CONSTRAINT IF EXISTS recipes_menu_item_id_menu_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.recipes DROP CONSTRAINT IF EXISTS recipes_created_by_staff_id_staff_id_fk;
ALTER TABLE IF EXISTS ONLY public.recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_recipe_id_recipes_id_fk;
ALTER TABLE IF EXISTS ONLY public.recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_inventory_item_id_inventory_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_order_id_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_table_id_tables_id_fk;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_staff_id_staff_id_fk;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_menu_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_item_modifiers DROP CONSTRAINT IF EXISTS order_item_modifiers_order_item_id_order_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.order_item_modifiers DROP CONSTRAINT IF EXISTS order_item_modifiers_modifier_option_id_modifier_options_id_fk;
ALTER TABLE IF EXISTS ONLY public.modifier_options DROP CONSTRAINT IF EXISTS modifier_options_group_id_modifier_groups_id_fk;
ALTER TABLE IF EXISTS ONLY public.modifier_groups DROP CONSTRAINT IF EXISTS modifier_groups_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_menu_categories_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_item_recipes DROP CONSTRAINT IF EXISTS menu_item_recipes_menu_item_id_menu_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_item_recipes DROP CONSTRAINT IF EXISTS menu_item_recipes_inventory_item_id_inventory_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_item_modifier_groups DROP CONSTRAINT IF EXISTS menu_item_modifier_groups_modifier_group_id_modifier_groups_id_;
ALTER TABLE IF EXISTS ONLY public.menu_item_modifier_groups DROP CONSTRAINT IF EXISTS menu_item_modifier_groups_menu_item_id_menu_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_inventory_item_id_inventory_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_created_by_staff_id_staff_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_supply_logs DROP CONSTRAINT IF EXISTS inventory_supply_logs_staff_id_staff_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_supply_logs DROP CONSTRAINT IF EXISTS inventory_supply_logs_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_supply_logs DROP CONSTRAINT IF EXISTS inventory_supply_logs_inventory_item_id_inventory_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_staff_id_staff_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_inventory_item_id_inventory_items_id_fk;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.areas DROP CONSTRAINT IF EXISTS areas_outlet_id_outlets_id_fk;
ALTER TABLE IF EXISTS ONLY public.tables DROP CONSTRAINT IF EXISTS tables_pkey;
ALTER TABLE IF EXISTS ONLY public.suppliers DROP CONSTRAINT IF EXISTS suppliers_pkey;
ALTER TABLE IF EXISTS ONLY public.stock_entry_items DROP CONSTRAINT IF EXISTS stock_entry_items_pkey;
ALTER TABLE IF EXISTS ONLY public.stock_entries DROP CONSTRAINT IF EXISTS stock_entries_pkey;
ALTER TABLE IF EXISTS ONLY public.staff DROP CONSTRAINT IF EXISTS staff_pkey;
ALTER TABLE IF EXISTS ONLY public.recipes DROP CONSTRAINT IF EXISTS recipes_pkey;
ALTER TABLE IF EXISTS ONLY public.recipe_ingredients DROP CONSTRAINT IF EXISTS recipe_ingredients_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.outlets DROP CONSTRAINT IF EXISTS outlets_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.order_item_modifiers DROP CONSTRAINT IF EXISTS order_item_modifiers_pkey;
ALTER TABLE IF EXISTS ONLY public.modifier_options DROP CONSTRAINT IF EXISTS modifier_options_pkey;
ALTER TABLE IF EXISTS ONLY public.modifier_groups DROP CONSTRAINT IF EXISTS modifier_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_items DROP CONSTRAINT IF EXISTS menu_items_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_item_recipes DROP CONSTRAINT IF EXISTS menu_item_recipes_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_item_modifier_groups DROP CONSTRAINT IF EXISTS menu_item_modifier_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.inventory_supply_logs DROP CONSTRAINT IF EXISTS inventory_supply_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pkey;
ALTER TABLE IF EXISTS ONLY public.inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_pkey;
ALTER TABLE IF EXISTS ONLY public.customers DROP CONSTRAINT IF EXISTS customers_pkey;
ALTER TABLE IF EXISTS ONLY public.areas DROP CONSTRAINT IF EXISTS areas_pkey;
ALTER TABLE IF EXISTS public.tables ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.suppliers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.stock_entry_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.stock_entries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.staff ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.recipes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.recipe_ingredients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.outlets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_item_modifiers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.modifier_options ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.modifier_groups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_item_recipes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_item_modifier_groups ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.menu_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventory_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventory_supply_logs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventory_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventory_adjustments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.customers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.areas ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.tables_id_seq;
DROP TABLE IF EXISTS public.tables;
DROP SEQUENCE IF EXISTS public.suppliers_id_seq;
DROP TABLE IF EXISTS public.suppliers;
DROP SEQUENCE IF EXISTS public.stock_entry_items_id_seq;
DROP TABLE IF EXISTS public.stock_entry_items;
DROP SEQUENCE IF EXISTS public.stock_entries_id_seq;
DROP TABLE IF EXISTS public.stock_entries;
DROP SEQUENCE IF EXISTS public.staff_id_seq;
DROP TABLE IF EXISTS public.staff;
DROP SEQUENCE IF EXISTS public.recipes_id_seq;
DROP TABLE IF EXISTS public.recipes;
DROP SEQUENCE IF EXISTS public.recipe_ingredients_id_seq;
DROP TABLE IF EXISTS public.recipe_ingredients;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.outlets_id_seq;
DROP TABLE IF EXISTS public.outlets;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.order_items_id_seq;
DROP TABLE IF EXISTS public.order_items;
DROP SEQUENCE IF EXISTS public.order_item_modifiers_id_seq;
DROP TABLE IF EXISTS public.order_item_modifiers;
DROP SEQUENCE IF EXISTS public.modifier_options_id_seq;
DROP TABLE IF EXISTS public.modifier_options;
DROP SEQUENCE IF EXISTS public.modifier_groups_id_seq;
DROP TABLE IF EXISTS public.modifier_groups;
DROP SEQUENCE IF EXISTS public.menu_items_id_seq;
DROP TABLE IF EXISTS public.menu_items;
DROP SEQUENCE IF EXISTS public.menu_item_recipes_id_seq;
DROP TABLE IF EXISTS public.menu_item_recipes;
DROP SEQUENCE IF EXISTS public.menu_item_modifier_groups_id_seq;
DROP TABLE IF EXISTS public.menu_item_modifier_groups;
DROP SEQUENCE IF EXISTS public.menu_categories_id_seq;
DROP TABLE IF EXISTS public.menu_categories;
DROP SEQUENCE IF EXISTS public.inventory_transactions_id_seq;
DROP TABLE IF EXISTS public.inventory_transactions;
DROP SEQUENCE IF EXISTS public.inventory_supply_logs_id_seq;
DROP TABLE IF EXISTS public.inventory_supply_logs;
DROP SEQUENCE IF EXISTS public.inventory_items_id_seq;
DROP TABLE IF EXISTS public.inventory_items;
DROP SEQUENCE IF EXISTS public.inventory_adjustments_id_seq;
DROP TABLE IF EXISTS public.inventory_adjustments;
DROP SEQUENCE IF EXISTS public.customers_id_seq;
DROP TABLE IF EXISTS public.customers;
DROP SEQUENCE IF EXISTS public.areas_id_seq;
DROP TABLE IF EXISTS public.areas;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'standard'::text NOT NULL,
    hourly_rate numeric(10,2),
    color text DEFAULT '#6366f1'::text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    outlet_id integer,
    name text NOT NULL,
    phone text,
    email text,
    credit_balance numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: inventory_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_adjustments (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    type text NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit text NOT NULL,
    reason text,
    staff_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_adjustments_id_seq OWNED BY public.inventory_adjustments.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    name text NOT NULL,
    unit text DEFAULT 'piece'::text NOT NULL,
    category text,
    current_stock numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    cost_per_unit numeric(10,4) DEFAULT '0'::numeric NOT NULL,
    low_stock_threshold numeric(14,4) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: inventory_supply_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_supply_logs (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity numeric(14,4) NOT NULL,
    cost_per_unit numeric(10,4),
    total_cost numeric(10,2),
    note text,
    supplied_at timestamp with time zone DEFAULT now() NOT NULL,
    staff_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_supply_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_supply_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_supply_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_supply_logs_id_seq OWNED BY public.inventory_supply_logs.id;


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    type text NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit text NOT NULL,
    balance_before numeric(14,4) NOT NULL,
    balance_after numeric(14,4) NOT NULL,
    reference_type text,
    reference_id integer,
    notes text,
    created_by_staff_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_categories (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_categories_id_seq OWNED BY public.menu_categories.id;


--
-- Name: menu_item_modifier_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_modifier_groups (
    id integer NOT NULL,
    menu_item_id integer NOT NULL,
    modifier_group_id integer NOT NULL
);


--
-- Name: menu_item_modifier_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_item_modifier_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_item_modifier_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_item_modifier_groups_id_seq OWNED BY public.menu_item_modifier_groups.id;


--
-- Name: menu_item_recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_recipes (
    id integer NOT NULL,
    menu_item_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity numeric(14,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_item_recipes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_item_recipes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_item_recipes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_item_recipes_id_seq OWNED BY public.menu_item_recipes.id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    category_id integer NOT NULL,
    outlet_id integer NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: modifier_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modifier_groups (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    name text NOT NULL,
    required boolean DEFAULT false NOT NULL,
    multi_select boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: modifier_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modifier_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modifier_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modifier_groups_id_seq OWNED BY public.modifier_groups.id;


--
-- Name: modifier_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modifier_options (
    id integer NOT NULL,
    group_id integer NOT NULL,
    name text NOT NULL,
    price_adjustment numeric(10,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: modifier_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modifier_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modifier_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modifier_options_id_seq OWNED BY public.modifier_options.id;


--
-- Name: order_item_modifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_item_modifiers (
    id integer NOT NULL,
    order_item_id integer NOT NULL,
    modifier_option_id integer NOT NULL,
    name text NOT NULL,
    price_adjustment numeric(10,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: order_item_modifiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_item_modifiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_item_modifiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_item_modifiers_id_seq OWNED BY public.order_item_modifiers.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    menu_item_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    notes text,
    kitchen_status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    menu_item_name text NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    table_id integer NOT NULL,
    staff_id integer,
    status text DEFAULT 'open'::text NOT NULL,
    subtotal numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    tax_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount_percent numeric(5,2),
    total numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    time_fee numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    table_opened_at timestamp with time zone
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: outlets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outlets (
    id integer NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    tax_rate numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outlets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.outlets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: outlets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.outlets_id_seq OWNED BY public.outlets.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    method text NOT NULL,
    amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_id integer,
    slip_image_path text
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_ingredients (
    id integer NOT NULL,
    recipe_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recipe_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recipe_ingredients_id_seq OWNED BY public.recipe_ingredients.id;


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id integer NOT NULL,
    menu_item_id integer NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    yield_qty numeric(10,4) DEFAULT '1'::numeric NOT NULL,
    category text,
    notes text,
    created_by_staff_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recipes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recipes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recipes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recipes_id_seq OWNED BY public.recipes.id;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id integer NOT NULL,
    outlet_id integer,
    name text NOT NULL,
    role text NOT NULL,
    pin text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.staff_id_seq OWNED BY public.staff.id;


--
-- Name: stock_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_entries (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    supplier_id integer,
    supplier_name text,
    invoice_number text,
    purchase_date timestamp with time zone DEFAULT now() NOT NULL,
    received_by_staff_id integer,
    notes text,
    total_cost numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_entries_id_seq OWNED BY public.stock_entries.id;


--
-- Name: stock_entry_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_entry_items (
    id integer NOT NULL,
    stock_entry_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit text NOT NULL,
    cost_per_unit numeric(10,4) DEFAULT '0'::numeric NOT NULL,
    total_cost numeric(14,2) DEFAULT '0'::numeric NOT NULL,
    batch_number text,
    expiry_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_entry_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_entry_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_entry_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_entry_items_id_seq OWNED BY public.stock_entry_items.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    name text NOT NULL,
    contact text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tables (
    id integer NOT NULL,
    outlet_id integer NOT NULL,
    name text NOT NULL,
    capacity integer DEFAULT 4 NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    area_id integer
);


--
-- Name: tables_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tables_id_seq OWNED BY public.tables.id;


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: inventory_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments ALTER COLUMN id SET DEFAULT nextval('public.inventory_adjustments_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: inventory_supply_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_supply_logs ALTER COLUMN id SET DEFAULT nextval('public.inventory_supply_logs_id_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: menu_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories ALTER COLUMN id SET DEFAULT nextval('public.menu_categories_id_seq'::regclass);


--
-- Name: menu_item_modifier_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifier_groups ALTER COLUMN id SET DEFAULT nextval('public.menu_item_modifier_groups_id_seq'::regclass);


--
-- Name: menu_item_recipes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_recipes ALTER COLUMN id SET DEFAULT nextval('public.menu_item_recipes_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: modifier_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_groups ALTER COLUMN id SET DEFAULT nextval('public.modifier_groups_id_seq'::regclass);


--
-- Name: modifier_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_options ALTER COLUMN id SET DEFAULT nextval('public.modifier_options_id_seq'::regclass);


--
-- Name: order_item_modifiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_modifiers ALTER COLUMN id SET DEFAULT nextval('public.order_item_modifiers_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: outlets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets ALTER COLUMN id SET DEFAULT nextval('public.outlets_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: recipe_ingredients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients ALTER COLUMN id SET DEFAULT nextval('public.recipe_ingredients_id_seq'::regclass);


--
-- Name: recipes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes ALTER COLUMN id SET DEFAULT nextval('public.recipes_id_seq'::regclass);


--
-- Name: staff id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff ALTER COLUMN id SET DEFAULT nextval('public.staff_id_seq'::regclass);


--
-- Name: stock_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries ALTER COLUMN id SET DEFAULT nextval('public.stock_entries_id_seq'::regclass);


--
-- Name: stock_entry_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entry_items ALTER COLUMN id SET DEFAULT nextval('public.stock_entry_items_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: tables id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables ALTER COLUMN id SET DEFAULT nextval('public.tables_id_seq'::regclass);


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.areas (id, outlet_id, name, type, hourly_rate, color, description, created_at) FROM stdin;
2	9	Karaoke Room	timed	150.00	#22c55e	Private karaoke rooms	2026-05-13 12:10:05.200483+00
3	9	Outdoor	standard	\N	#ef4444	Rooftop seating	2026-05-13 12:10:05.388516+00
1	9	Indoor	standard	\N	#0ea5e9	Air-conditioned dining	2026-05-13 12:09:44.184352+00
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, outlet_id, name, phone, email, credit_balance, notes, created_at, updated_at) FROM stdin;
1	9	Maain	9464478	maa@test.com	50.00	\N	2026-05-13 10:57:51.013579+00	2026-05-15 21:41:44.048+00
\.


--
-- Data for Name: inventory_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_adjustments (id, outlet_id, inventory_item_id, type, quantity, unit, reason, staff_id, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_items (id, outlet_id, name, unit, category, current_stock, cost_per_unit, low_stock_threshold, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_supply_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_supply_logs (id, outlet_id, inventory_item_id, quantity, cost_per_unit, total_cost, note, supplied_at, staff_id, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_transactions (id, outlet_id, inventory_item_id, type, quantity, unit, balance_before, balance_after, reference_type, reference_id, notes, created_by_staff_id, created_at) FROM stdin;
\.


--
-- Data for Name: menu_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_categories (id, outlet_id, name, sort_order, created_at) FROM stdin;
24	9	Starters	1	2026-05-13 10:46:17.271383+00
25	9	Mains	2	2026-05-13 10:46:17.271383+00
26	9	Drinks	3	2026-05-13 10:46:17.271383+00
27	9	Desserts	4	2026-05-13 10:46:17.271383+00
28	10	Mains	1	2026-05-13 10:46:17.291393+00
29	10	Drinks	2	2026-05-13 10:46:17.291393+00
30	10	Desserts	3	2026-05-13 10:46:17.291393+00
\.


--
-- Data for Name: menu_item_modifier_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_item_modifier_groups (id, menu_item_id, modifier_group_id) FROM stdin;
35	70	9
36	70	10
37	71	9
38	71	10
39	72	9
40	72	10
41	73	9
42	73	10
43	74	9
44	75	9
45	76	9
46	83	11
47	83	12
48	84	11
49	84	12
50	85	11
51	85	12
\.


--
-- Data for Name: menu_item_recipes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_item_recipes (id, menu_item_id, inventory_item_id, quantity, created_at) FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_items (id, category_id, outlet_id, name, description, price, available, created_at, updated_at) FROM stdin;
88	30	10	Cookie		15.00	t	2026-05-13 13:28:00.708095+00	2026-05-13 13:28:00.708095+00
68	24	9	Garlic Bread	\N	6.50	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
69	24	9	Caesar Salad	\N	12.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
70	25	9	Grilled Salmon	\N	28.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
71	25	9	Ribeye Steak	\N	42.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
72	25	9	Pasta Carbonara	\N	18.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
73	25	9	Margherita Pizza	\N	22.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
74	26	9	Sparkling Water	\N	4.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
75	26	9	House Wine	\N	10.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
76	26	9	Soft Drink	\N	4.50	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
77	27	9	Tiramisu	\N	9.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
78	27	9	Chocolate Lava Cake	\N	11.00	t	2026-05-13 10:46:17.275461+00	2026-05-13 10:46:17.275461+00
79	28	10	Club Sandwich	\N	13.50	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
80	28	10	Caesar Salad	\N	11.00	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
81	28	10	Pasta Marinara	\N	15.00	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
82	28	10	Veggie Bowl	\N	12.00	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
83	29	10	Flat White	\N	5.50	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
84	29	10	Smoothie	\N	6.50	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
85	29	10	Sparkling Water	\N	3.00	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
86	30	10	Fruit Tart	\N	6.00	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
87	30	10	Brownie	\N	4.50	t	2026-05-13 10:46:17.295063+00	2026-05-13 10:46:17.295063+00
\.


--
-- Data for Name: modifier_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.modifier_groups (id, outlet_id, name, required, multi_select, created_at) FROM stdin;
9	9	Size	t	f	2026-05-13 10:46:17.280382+00
10	9	Add-ons	f	t	2026-05-13 10:46:17.280382+00
11	10	Temperature	f	f	2026-05-13 10:46:17.298661+00
12	10	Milk Type	f	f	2026-05-13 10:46:17.298661+00
\.


--
-- Data for Name: modifier_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.modifier_options (id, group_id, name, price_adjustment) FROM stdin;
21	9	Regular	0.00
22	9	Large	2.50
23	10	Extra Cheese	1.00
24	10	Bacon Strip	1.50
25	10	Avocado	2.00
26	11	Hot	0.00
27	11	Cold	0.00
28	12	Full Cream	0.00
29	12	Oat Milk	0.50
30	12	Soy Milk	0.50
\.


--
-- Data for Name: order_item_modifiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_item_modifiers (id, order_item_id, modifier_option_id, name, price_adjustment) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, menu_item_id, quantity, unit_price, total, notes, kitchen_status, created_at, menu_item_name) FROM stdin;
1	1	78	2	11.00	22.00	\N	pending	2026-05-13 13:40:22.234218+00	Chocolate Lava Cake
3	3	78	1	11.00	11.00	\N	pending	2026-05-13 13:48:23.57786+00	Chocolate Lava Cake
5	4	78	1	11.00	11.00	\N	pending	2026-05-13 13:48:29.807336+00	Chocolate Lava Cake
6	4	78	1	11.00	11.00	\N	pending	2026-05-13 13:48:30.010305+00	Chocolate Lava Cake
7	4	78	1	11.00	11.00	\N	pending	2026-05-13 13:48:30.117629+00	Chocolate Lava Cake
2	2	78	3	11.00	33.00	\N	pending	2026-05-13 13:48:23.503383+00	Chocolate Lava Cake
8	2	69	1	12.00	12.00	\N	pending	2026-05-13 13:57:14.282232+00	Caesar Salad
9	2	69	1	12.00	12.00	\N	pending	2026-05-13 13:57:14.46292+00	Caesar Salad
10	2	69	1	12.00	12.00	\N	pending	2026-05-13 13:57:14.512664+00	Caesar Salad
12	6	77	1	9.00	9.00	\N	served	2026-05-13 14:21:09.600247+00	Tiramisu
14	9	75	1	10.00	10.00	\N	preparing	2026-05-13 14:40:00.023648+00	House Wine
15	9	75	1	10.00	10.00	\N	preparing	2026-05-13 14:40:00.476733+00	House Wine
17	9	75	1	10.00	10.00	\N	preparing	2026-05-13 14:40:00.82598+00	House Wine
16	9	75	1	10.00	10.00	\N	preparing	2026-05-13 14:40:00.817856+00	House Wine
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, outlet_id, table_id, staff_id, status, subtotal, tax_amount, discount_amount, discount_percent, total, notes, created_at, updated_at, time_fee, table_opened_at) FROM stdin;
1	9	45	\N	paid	22.00	1.76	0.00	\N	23.76	\N	2026-05-13 13:32:10.170825+00	2026-05-13 13:41:12.922+00	0.00	2026-05-13 13:32:10.169+00
3	9	45	\N	paid	11.00	0.88	0.00	\N	11.88	\N	2026-05-13 13:48:23.419099+00	2026-05-13 13:48:50.374+00	0.00	2026-05-13 13:48:23.418+00
4	9	45	\N	paid	33.00	2.64	0.00	\N	35.64	\N	2026-05-13 13:48:23.803316+00	2026-05-13 14:02:49.194+00	0.00	2026-05-13 13:48:23.802+00
2	9	45	\N	paid	69.00	5.52	0.00	\N	74.52	\N	2026-05-13 13:48:23.253665+00	2026-05-13 14:03:17.387+00	0.00	2026-05-13 13:48:23.252+00
7	9	49	\N	cancelled	0.00	0.00	0.00	\N	0.00	\N	2026-05-13 14:28:04.18487+00	2026-05-13 14:28:27.711+00	0.00	2026-05-13 14:28:04.183+00
8	9	49	\N	cancelled	0.00	0.00	0.00	\N	0.00	\N	2026-05-13 14:28:04.307528+00	2026-05-13 14:28:27.769+00	0.00	2026-05-13 14:28:04.307+00
9	9	46	\N	paid	40.00	3.20	0.00	\N	43.20	\N	2026-05-13 14:39:59.71507+00	2026-05-13 14:40:56.8+00	0.00	2026-05-13 14:39:59.713+00
10	9	44	31	cancelled	0.00	0.00	0.00	\N	0.00	\N	2026-05-16 07:48:08.006771+00	2026-05-16 08:19:52.833+00	0.00	2026-05-16 07:48:08.005+00
11	9	44	31	cancelled	0.00	0.00	0.00	\N	0.00	\N	2026-05-16 08:30:23.679461+00	2026-05-16 08:30:45.065+00	0.00	2026-05-16 08:30:23.679+00
6	9	49	\N	cancelled	9.00	0.72	0.00	\N	9.72	\N	2026-05-13 14:21:09.153711+00	2026-05-16 08:31:27.698+00	0.00	2026-05-13 14:21:09.153+00
5	9	49	\N	cancelled	0.00	0.00	0.00	\N	0.00	\N	2026-05-13 14:21:08.66893+00	2026-05-16 08:53:43.263+00	0.00	2026-05-13 14:21:08.667+00
12	9	44	23	cancelled	0.00	0.00	0.00	\N	0.00	\N	2026-05-16 08:54:13.163485+00	2026-05-16 08:54:29.404+00	0.00	2026-05-16 08:54:13.162+00
\.


--
-- Data for Name: outlets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.outlets (id, name, address, phone, tax_rate, currency, created_at, updated_at) FROM stdin;
10	Shabnam Cafe	Shabnam lodge	55555	8.00	MVR	2026-05-13 10:46:16.679462+00	2026-05-16 08:47:54.72+00
9	Ithaa Corner	Ithaa, athiri magu, L. Isdhoo	+9609969252	8.00	MVR	2026-05-13 10:46:16.679462+00	2026-05-16 08:48:37.953+00
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, order_id, method, amount, created_at, customer_id, slip_image_path) FROM stdin;
1	1	cash	23.76	2026-05-13 13:41:12.907108+00	\N	\N
2	3	bank_transfer	11.88	2026-05-13 13:48:50.369887+00	\N	/objects/uploads/c9207d00-ebbe-44c5-a6ef-03f3b735ef4a
3	4	cash	35.64	2026-05-13 14:02:49.171977+00	\N	\N
4	2	cash	74.52	2026-05-13 14:03:17.382523+00	\N	\N
5	9	bank_transfer	43.20	2026-05-13 14:40:56.793909+00	\N	/objects/uploads/f4ba7461-e725-4a93-89de-7989f42e9204
\.


--
-- Data for Name: recipe_ingredients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, created_at) FROM stdin;
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipes (id, menu_item_id, version, status, yield_qty, category, notes, created_by_staff_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: staff; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.staff (id, outlet_id, name, role, pin, created_at, updated_at) FROM stdin;
32	10	MANAGER	manager	$2b$10$OFyLRVlM4xe0de8e31c/WeiaPuSUhFj5tzb7fURYMX7Bn7mEcLrGq	2026-05-15 20:59:06.806421+00	2026-05-16 08:41:19.232+00
30	10	CASHIER	cashier	$2b$10$ZKAmmtQT9Q6j9nMiYIy8EOLsesxIx7sk0wiUoj4VgVPowcaz05NbS	2026-05-15 20:58:37.497916+00	2026-05-16 08:41:25.312+00
31	9	CASHIER	cashier	$2b$10$pnYNZDx1IZ2g2T7vSKUsDOLMGBcsY2aZ7.UA9wSrhh6N1llZ62c6C	2026-05-15 20:58:49.578987+00	2026-05-16 08:41:35.144+00
35	9	KDS	kitchen	$2b$10$1vSYuY9v2lbuDhVdeCgbFeJ7deGc0hKe282F9tc/Crv7QmofkbPbW	2026-05-15 21:00:04.348663+00	2026-05-16 08:41:44.442+00
34	10	KDS	kitchen	$2b$10$sRVbiuozQ0Aw0KbvSGGh2.l51AYN4DnixER4IhFZg/HqVmwwLeqWS	2026-05-15 20:59:48.377044+00	2026-05-16 08:41:51.981+00
33	9	MANAGER	manager	$2b$10$60lhhxn3RfE0ndmbCuEXo.lAAbEBeGj.XIp1nos91bT7ZbhCPSkIC	2026-05-15 20:59:15.773655+00	2026-05-16 08:42:02.661+00
23	9	SUDO	super_admin	$2b$10$THrw1hgNt8H31ZMZ5THSO.M2Ixe6.sO8FdbKZsHFhkcFgtzjMmP.a	2026-05-13 10:46:17.266901+00	2026-05-16 08:42:43.706+00
\.


--
-- Data for Name: stock_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_entries (id, outlet_id, supplier_id, supplier_name, invoice_number, purchase_date, received_by_staff_id, notes, total_cost, created_at) FROM stdin;
\.


--
-- Data for Name: stock_entry_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_entry_items (id, stock_entry_id, inventory_item_id, quantity, unit, cost_per_unit, total_cost, batch_number, expiry_date, created_at) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.suppliers (id, outlet_id, name, contact, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tables; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tables (id, outlet_id, name, capacity, status, created_at, area_id) FROM stdin;
45	9	T2	4	available	2026-05-13 10:46:16.684497+00	1
46	9	T3	4	available	2026-05-13 10:46:16.684497+00	1
56	9	T7	4	available	2026-05-16 08:34:01.770626+00	2
57	9	T8	2	available	2026-05-16 08:34:11.696735+00	2
49	9	T6	4	available	2026-05-13 10:46:16.684497+00	2
44	9	T1	4	available	2026-05-13 10:46:16.684497+00	1
50	10	T1	4	available	2026-05-13 10:46:16.684497+00	\N
51	10	T2	4	available	2026-05-13 10:46:16.684497+00	\N
52	10	T3	4	available	2026-05-13 10:46:16.684497+00	\N
53	10	T4	4	available	2026-05-13 10:46:16.684497+00	\N
54	10	T5	4	available	2026-05-13 10:46:16.684497+00	\N
55	10	T6	4	available	2026-05-13 10:46:16.684497+00	\N
47	9	T4	4	available	2026-05-13 10:46:16.684497+00	3
48	9	T5	4	available	2026-05-13 10:46:16.684497+00	3
\.


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.areas_id_seq', 3, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 1, true);


--
-- Name: inventory_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_adjustments_id_seq', 1, false);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 1, false);


--
-- Name: inventory_supply_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_supply_logs_id_seq', 1, false);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_transactions_id_seq', 1, false);


--
-- Name: menu_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_categories_id_seq', 30, true);


--
-- Name: menu_item_modifier_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_item_modifier_groups_id_seq', 51, true);


--
-- Name: menu_item_recipes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_item_recipes_id_seq', 1, false);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 88, true);


--
-- Name: modifier_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modifier_groups_id_seq', 12, true);


--
-- Name: modifier_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.modifier_options_id_seq', 30, true);


--
-- Name: order_item_modifiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_item_modifiers_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 22, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 12, true);


--
-- Name: outlets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.outlets_id_seq', 10, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 5, true);


--
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recipe_ingredients_id_seq', 1, false);


--
-- Name: recipes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recipes_id_seq', 1, false);


--
-- Name: staff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.staff_id_seq', 35, true);


--
-- Name: stock_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_entries_id_seq', 1, false);


--
-- Name: stock_entry_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stock_entry_items_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 1, false);


--
-- Name: tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tables_id_seq', 57, true);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: inventory_adjustments inventory_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_supply_logs inventory_supply_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_supply_logs
    ADD CONSTRAINT inventory_supply_logs_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_item_modifier_groups menu_item_modifier_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifier_groups
    ADD CONSTRAINT menu_item_modifier_groups_pkey PRIMARY KEY (id);


--
-- Name: menu_item_recipes menu_item_recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_recipes
    ADD CONSTRAINT menu_item_recipes_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: modifier_groups modifier_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_groups
    ADD CONSTRAINT modifier_groups_pkey PRIMARY KEY (id);


--
-- Name: modifier_options modifier_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_options
    ADD CONSTRAINT modifier_options_pkey PRIMARY KEY (id);


--
-- Name: order_item_modifiers order_item_modifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_modifiers
    ADD CONSTRAINT order_item_modifiers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: outlets outlets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: stock_entries stock_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_pkey PRIMARY KEY (id);


--
-- Name: stock_entry_items stock_entry_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entry_items
    ADD CONSTRAINT stock_entry_items_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tables tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_pkey PRIMARY KEY (id);


--
-- Name: areas areas_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: customers customers_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: inventory_adjustments inventory_adjustments_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_adjustments inventory_adjustments_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: inventory_adjustments inventory_adjustments_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: inventory_items inventory_items_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: inventory_supply_logs inventory_supply_logs_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_supply_logs
    ADD CONSTRAINT inventory_supply_logs_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_supply_logs inventory_supply_logs_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_supply_logs
    ADD CONSTRAINT inventory_supply_logs_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: inventory_supply_logs inventory_supply_logs_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_supply_logs
    ADD CONSTRAINT inventory_supply_logs_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: inventory_transactions inventory_transactions_created_by_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_created_by_staff_id_staff_id_fk FOREIGN KEY (created_by_staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: inventory_transactions inventory_transactions_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: menu_categories menu_categories_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: menu_item_modifier_groups menu_item_modifier_groups_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifier_groups
    ADD CONSTRAINT menu_item_modifier_groups_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_item_modifier_groups menu_item_modifier_groups_modifier_group_id_modifier_groups_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_modifier_groups
    ADD CONSTRAINT menu_item_modifier_groups_modifier_group_id_modifier_groups_id_ FOREIGN KEY (modifier_group_id) REFERENCES public.modifier_groups(id) ON DELETE CASCADE;


--
-- Name: menu_item_recipes menu_item_recipes_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_recipes
    ADD CONSTRAINT menu_item_recipes_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: menu_item_recipes menu_item_recipes_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_recipes
    ADD CONSTRAINT menu_item_recipes_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_menu_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_menu_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: modifier_groups modifier_groups_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_groups
    ADD CONSTRAINT modifier_groups_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: modifier_options modifier_options_group_id_modifier_groups_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modifier_options
    ADD CONSTRAINT modifier_options_group_id_modifier_groups_id_fk FOREIGN KEY (group_id) REFERENCES public.modifier_groups(id) ON DELETE CASCADE;


--
-- Name: order_item_modifiers order_item_modifiers_modifier_option_id_modifier_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_modifiers
    ADD CONSTRAINT order_item_modifiers_modifier_option_id_modifier_options_id_fk FOREIGN KEY (modifier_option_id) REFERENCES public.modifier_options(id);


--
-- Name: order_item_modifiers order_item_modifiers_order_item_id_order_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_modifiers
    ADD CONSTRAINT order_item_modifiers_order_item_id_order_items_id_fk FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: orders orders_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: orders orders_table_id_tables_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_table_id_tables_id_fk FOREIGN KEY (table_id) REFERENCES public.tables(id);


--
-- Name: payments payments_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: recipe_ingredients recipe_ingredients_recipe_id_recipes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_recipes_id_fk FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_created_by_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_created_by_staff_id_staff_id_fk FOREIGN KEY (created_by_staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: recipes recipes_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: staff staff_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL;


--
-- Name: stock_entries stock_entries_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: stock_entries stock_entries_received_by_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_received_by_staff_id_staff_id_fk FOREIGN KEY (received_by_staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: stock_entries stock_entries_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entries
    ADD CONSTRAINT stock_entries_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: stock_entry_items stock_entry_items_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entry_items
    ADD CONSTRAINT stock_entry_items_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: stock_entry_items stock_entry_items_stock_entry_id_stock_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_entry_items
    ADD CONSTRAINT stock_entry_items_stock_entry_id_stock_entries_id_fk FOREIGN KEY (stock_entry_id) REFERENCES public.stock_entries(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: tables tables_area_id_areas_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_area_id_areas_id_fk FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: tables tables_outlet_id_outlets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT tables_outlet_id_outlets_id_fk FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


