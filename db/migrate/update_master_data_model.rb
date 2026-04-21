# Migration to update the master data model

class UpdateMasterDataModel < ActiveRecord::Migration[6.0]
  def change
    # Step 1: Remove SITES
    drop_table :sites, if_exists: true

    # Step 2: Unify companies with company_category
    remove_column :companies, :company_category
    add_column :companies, :company_category, :string, null: false, default: 'CUSTOMER'

    # Step 3: Implement company_roles with role_type
    create_table :company_roles do |t|
      t.references :company, null: false, foreign_key: true
      t.string :role_type, null: false
      t.index [:company_id, :role_type], unique: true
      t.timestamps
    end

    # Step 4: Update users to require company_id and address_id
    change_table :users do |t|
      t.references :company, null: false, foreign_key: true
      t.references :address, null: false, foreign_key: true
    end
  end
end
