---
name: DB Rules
description: Coding standards for Drizzle ORM with Bun SQLite
applyTo: '**/*.ts, **/*.js'
---

# Drizzle \<\> Bun SQLite

<Prerequisites>
- Database [connection basics](/docs/connect-overview) with Drizzle
- Bun - [website](https://bun.sh/docs)
- Bun SQLite driver - [docs](https://bun.sh/docs/api/sqlite)
</Prerequisites>

According to the **[official website](https://bun.sh/)**, Bun is a fast all-in-one JavaScript runtime.

Drizzle ORM natively supports **[`bun:sqlite`](https://bun.sh/docs/api/sqlite)** module and it's crazy fast 🚀

We embrace SQL dialects and dialect specific drivers and syntax and unlike any other ORM,
for synchronous drivers like `bun:sqlite` we have both **async** and **sync** APIs and we mirror most popular
SQLite-like `all`, `get`, `values` and `run` query methods syntax.

#### Step 1 - Install packages

<Npm>
drizzle-orm
-D drizzle-kit
</Npm>

#### Step 2 - Initialize the driver and make a query

```typescript copy
import { drizzle } from 'drizzle-orm/bun-sqlite';

const db = drizzle();

const result = await db.select().from(...);
```

If you need to provide your existing driver:

```typescript copy
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

const sqlite = new Database('sqlite.db');
const db = drizzle({ client: sqlite });

const result = await db.select().from(...);
```

If you want to use **sync** APIs:

```typescript copy
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';

const sqlite = new Database('sqlite.db');
const db = drizzle({ client: sqlite });

const result = db.select().from(users).all();
const result = db.select().from(users).get();
const result = db.select().from(users).values();
const result = db.select().from(users).run();
```

<Tab>
    #### Database side
    **Types**: `STORED`, `VIRTUAL`

    **How It Works**
    - Defined with an expression in the table schema.
    - Virtual columns are computed during read operations.
    - Stored columns are computed during write operations and stored.

    **Capabilities**
    - Used in SELECT, INSERT, UPDATE, and DELETE statements.
    - Can be indexed, both virtual and stored.
    - Can specify NOT NULL and other constraints.

    **Limitations**
    - Cannot directly insert or update values in a generated column

    For more info, please check [SQLite](https://www.sqlite.org/gencol.html) docs

    #### Drizzle side
    In Drizzle you can specify `.generatedAlwaysAs()` function on any column type and add a supported sql query,
    that will generate this column data for you.

    #### Features
    This function can accept generated expression in 2 ways:

    <Callout type='warning' collapsed="What was changed starting from 1.0.0-beta.12 version">

    In versions before 1.0.0-beta.12, `.generatedAlwaysAs()` also accepted literals as expressions.

    **`string`**
    <CodeTab>
    ```ts
    export const test = sqliteTable("test", {
        id: int("id").primaryKey(),
        generatedName: text("gen_name").generatedAlwaysAs(`'hello world!'`),
    });
    ```

    ```sql
    CREATE TABLE `test` (
        `id` integer PRIMARY KEY,
        `gen_name` text GENERATED ALWAYS AS ('hello world!') VIRTUAL
    );
    ```
    </CodeTab>

    </Callout>

    **`sql`** tag - if you want drizzle to escape some values for you

    ```ts
    export const test = sqliteTable("test", {
        id: int("id").primaryKey(),
        generatedName: text("gen_name").generatedAlwaysAs(sql`'hello "world"!'`),
    });
    ```
    ```sql
    CREATE TABLE `test` (
      `id` integer PRIMARY KEY,
      `gen_name` text GENERATED ALWAYS AS ('hello "world"!') VIRTUAL
    );
    ```

    **`callback`** - if you need to reference columns from a table

    ```ts
    export const test = sqliteTable("test", {
        name: text("first_name"),
        generatedName: text("gen_name").generatedAlwaysAs(
          (): SQL => sql`'hi,' || ${test.name} || '!'`
        ),
    });
    ```
    ```sql
    CREATE TABLE `test` (
      `first_name` text,
      `gen_name` text GENERATED ALWAYS AS ('hi,' || "first_name" || '!') VIRTUAL
    );
    ```

    #### Limitations
    Drizzle Kit will also have limitations for `push` and `generate` command:
    1. You can't change the generated constraint expression with the stored type in an existing table. You would need to delete this table and create it again. This is due to SQLite limitations for such actions. We will handle this case in future releases (it will involve the creation of a new table with data migration).
    2. You can't add a `stored` generated expression to an existing column for the same reason as above. However, you can add a `virtual` expression to an existing column.
    3. You can't change a `stored` generated expression in an existing column for the same reason as above. However, you can change a `virtual` expression.
    4. You can't change the generated constraint type from `virtual` to `stored` for the same reason as above. However, you can change from `stored` to `virtual`.

<CodeTabs items={["schema.ts"]}>
<CodeTab>
``typescript copy
    export const users = sqliteTable("users", {
      id: int("id"),
      name: text("name"),
      storedGenerated: text("stored_gen").generatedAlwaysAs(
        (): SQL => sql`${users.name} || 'hello'`,
        { mode: "stored" }
      ),
      virtualGenerated: text("virtual_gen").generatedAlwaysAs(
        (): SQL => sql`${users.name} || 'hello'`,
        { mode: "virtual" }
      ),
    });
    ``
``sql
    CREATE TABLE `users` (
	    `id` integer,
	    `name` text,
	    `stored_gen` text GENERATED ALWAYS AS ("name" || 'hello') STORED,
	    `virtual_gen` text GENERATED ALWAYS AS ("name" || 'hello') VIRTUAL
    );
    ``
</CodeTab>
</CodeTabs>
</Tab>
