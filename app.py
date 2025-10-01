import psycopg2

# ✅ Your connection string
CONNECTION_STRING = "postgresql+psycopg2://postgres:root@localhost:5432/psycho"

def create_tables():
    # psycopg2 needs the DSN without the dialect prefix
    conn = psycopg2.connect(
        dbname="psycho",
        user="postgres",
        password="root",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()

    # ✅ SQL script to create extension and tables
    sql_script = """
    -- Enable uuid-ossp extension if not present
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 1) users table
    CREATE TABLE IF NOT EXISTS users (
      user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(150) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
      otp VARCHAR(20) NULL
    );

    -- 2) userdetails table
    CREATE TABLE IF NOT EXISTS userdetails (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      full_name VARCHAR(250),
      age INTEGER,
      gender VARCHAR(50),
      date_of_birth DATE,
      contact_number VARCHAR(50),
      email_id VARCHAR(254),
      address TEXT,
      educational_qualification TEXT,
      organization_company TEXT,
      any_illness TEXT,
      signature_base64 TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- 3) form_progress table
    CREATE TABLE IF NOT EXISTS form_progress (
      form_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      form_name VARCHAR(150) NOT NULL,
      current_progress VARCHAR(50) DEFAULT 'not_started',
      last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- 4) records table
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      form_id UUID NOT NULL,
      form_name VARCHAR(150),
      responses JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    """

    try:
        cur.execute(sql_script)
        conn.commit()
        print("✅ All tables created successfully.")
    except Exception as e:
        conn.rollback()
        print("❌ Error creating tables:", e)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_tables()
