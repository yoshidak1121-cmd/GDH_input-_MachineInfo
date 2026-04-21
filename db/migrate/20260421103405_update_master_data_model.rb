class UpdateMasterDataModel < ActiveRecord::Migration[6.0]
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

    execute <<~SQL
      UPDATE companies
      SET company_category = 'CUSTOMER'
      WHERE company_category IS NULL
    SQL

    change_column_default :companies, :company_category, from: nil, to: 'CUSTOMER'
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
        t.string :role_type, null: false
        t.timestamps
      end
    end

    unless index_exists?(:company_roles, [:company_id, :role_type], unique: true, name: 'index_company_roles_on_company_id_and_role_type')
      add_index :company_roles, [:company_id, :role_type], unique: true, name: 'index_company_roles_on_company_id_and_role_type'
    end

    # role_type candidates: NC_SALES, NC_SERVICE, END_CUSTOMER, AGENT, MAKER
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

    fill_users_company_id_if_null
    fill_users_address_id_if_null

    change_column_null :users, :company_id, false if column_exists?(:users, :company_id)
    change_column_null :users, :address_id, false if column_exists?(:users, :address_id)
  end

  def fill_users_company_id_if_null
    return unless table_exists?(:companies)

    company_id = select_value('SELECT id FROM companies ORDER BY id ASC LIMIT 1')
    return if company_id.nil?

    execute <<~SQL
      UPDATE users
      SET company_id = #{connection.quote(company_id)}
      WHERE company_id IS NULL
    SQL
  end

  def fill_users_address_id_if_null
    return unless table_exists?(:addresses)

    address_id = select_value('SELECT id FROM addresses ORDER BY id ASC LIMIT 1')
    return if address_id.nil?

    execute <<~SQL
      UPDATE users
      SET address_id = #{connection.quote(address_id)}
      WHERE address_id IS NULL
    SQL
  end
end
