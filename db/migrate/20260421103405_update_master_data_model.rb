class UpdateMasterDataModel < ActiveRecord::Migration[6.0]
  COMPANY_ROLES_UNIQUE_INDEX = 'index_company_roles_on_company_id_and_role_type'.freeze

  def up
    remove_sites
    ensure_companies_company_category
    ensure_company_roles
    ensure_users_company_and_address
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end

  private

  def remove_sites
    drop_table :sites, if_exists: true
  end

  def ensure_companies_company_category
    return unless table_exists?(:companies)

    unless column_exists?(:companies, :company_category)
      add_column :companies, :company_category, :string, default: 'CUSTOMER'
    end

    has_null = select_value('SELECT EXISTS(SELECT 1 FROM companies WHERE company_category IS NULL LIMIT 1)')
    if ActiveRecord::Type::Boolean.new.cast(has_null)
      execute <<~SQL
        UPDATE companies
        SET company_category = 'CUSTOMER'
        WHERE company_category IS NULL
      SQL
    end

    column = connection.columns(:companies).find { |c| c.name == 'company_category' }
    change_column_default(:companies, :company_category, 'CUSTOMER') if column&.default != 'CUSTOMER'
    change_column_null :companies, :company_category, false
  end

  def ensure_company_roles
    return unless table_exists?(:companies)

    if table_exists?(:company_roles)
      add_column :company_roles, :company_id, :bigint unless column_exists?(:company_roles, :company_id)
      add_column :company_roles, :role_type, :string unless column_exists?(:company_roles, :role_type)

      change_column_null :company_roles, :company_id, false if column_exists?(:company_roles, :company_id)
      change_column_null :company_roles, :role_type, false if column_exists?(:company_roles, :role_type)

      unless foreign_key_exists?(:company_roles, :companies, column: :company_id)
        add_foreign_key :company_roles, :companies, column: :company_id
      end
    else
      create_table :company_roles do |t|
        t.references :company, null: false, foreign_key: true
        t.string :role_type, null: false # NC_SALES, NC_SERVICE, END_CUSTOMER, AGENT, MAKER
        t.timestamps
      end
    end

    unless index_exists?(:company_roles, [:company_id, :role_type], unique: true, name: COMPANY_ROLES_UNIQUE_INDEX)
      add_index :company_roles, [:company_id, :role_type], unique: true, name: COMPANY_ROLES_UNIQUE_INDEX
    end
  end

  def ensure_users_company_and_address
    return unless table_exists?(:users)

    add_reference :users, :company, foreign_key: true unless column_exists?(:users, :company_id)
    add_reference :users, :address, foreign_key: true unless column_exists?(:users, :address_id)

    if column_exists?(:users, :company_id) && table_exists?(:companies) && !foreign_key_exists?(:users, :companies, column: :company_id)
      add_foreign_key :users, :companies, column: :company_id
    end

    if column_exists?(:users, :address_id) && table_exists?(:addresses) && !foreign_key_exists?(:users, :addresses, column: :address_id)
      add_foreign_key :users, :addresses, column: :address_id
    end

    assert_no_null_users_company_id
    assert_no_null_users_address_id

    change_column_null :users, :company_id, false if column_exists?(:users, :company_id)
    change_column_null :users, :address_id, false if column_exists?(:users, :address_id)
  end

  def assert_no_null_users_company_id
    return unless column_exists?(:users, :company_id)

    has_null = select_value('SELECT EXISTS(SELECT 1 FROM users WHERE company_id IS NULL LIMIT 1)')
    return unless ActiveRecord::Type::Boolean.new.cast(has_null)

    raise ActiveRecord::IrreversibleMigration, 'Cannot set users.company_id to NOT NULL while NULL values exist. Backfill data first.'
  end

  def assert_no_null_users_address_id
    return unless column_exists?(:users, :address_id)

    has_null = select_value('SELECT EXISTS(SELECT 1 FROM users WHERE address_id IS NULL LIMIT 1)')
    return unless ActiveRecord::Type::Boolean.new.cast(has_null)

    raise ActiveRecord::IrreversibleMigration, 'Cannot set users.address_id to NOT NULL while NULL values exist. Backfill data first.'
  end
end
