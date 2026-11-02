const { Party, PartyRole } = require('../models');

const DEFAULT_COUNTERPARTIES = [
  // 1. Underwriting Carriers (Admitted & Surplus Lines)
  {
    party_code: 'CARRIER-SUMMIT',
    legal_name: 'Summit Mutual Insurance Company',
    trade_name: 'Summit Mutual Group',
    party_type: 'ORGANIZATION',
    tax_id: '12-3456780',
    email: 'underwriting@summitmutual.com',
    phone: '212-555-0100',
    address: {
      street1: '100 Wall Street',
      city: 'New York',
      state: 'NY',
      postal_code: '10005',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['CARRIER'],
    role_details: {
      naic_code: '23450',
      am_best_rating: 'A+',
      state_of_domicile: 'NY',
      paper_type: 'ADMITTED',
      remittance_split_pct: 80.0
    }
  },
  {
    party_code: 'CARRIER-SOUTHLAKE',
    legal_name: 'Southlake Specialty Insurance Company',
    trade_name: 'Southlake Specialty',
    party_type: 'ORGANIZATION',
    tax_id: '75-4422119',
    email: 'programs@southlakespecialty.com',
    phone: '817-555-0144',
    address: {
      street1: '1200 E Southlake Blvd',
      city: 'Southlake',
      state: 'TX',
      postal_code: '76092',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['CARRIER'],
    role_details: {
      naic_code: '16832',
      am_best_rating: 'A',
      state_of_domicile: 'TX',
      paper_type: 'SURPLUS_LINES',
      remittance_split_pct: 82.5
    }
  },
  {
    party_code: 'CARRIER-CLEARSPRING',
    legal_name: 'ClearSpring Property & Casualty Company',
    trade_name: 'ClearSpring P&C',
    party_type: 'ORGANIZATION',
    tax_id: '36-8899221',
    email: 'commercial@clearspring.com',
    phone: '312-555-0188',
    address: {
      street1: '300 S Wacker Dr',
      city: 'Chicago',
      state: 'IL',
      postal_code: '60606',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['CARRIER'],
    role_details: {
      naic_code: '15563',
      am_best_rating: 'A-',
      state_of_domicile: 'TX',
      paper_type: 'ADMITTED',
      remittance_split_pct: 77.5
    }
  },

  // 2. Managing General Agent (MGA)
  {
    party_code: 'MGA-HARBOR',
    legal_name: 'Harbor Risk Underwriting Managers LLC',
    trade_name: 'Harbor Specialty MGA',
    party_type: 'ORGANIZATION',
    tax_id: '74-1234567',
    email: 'underwriting@harborspecialty.com',
    phone: '512-555-0150',
    address: {
      street1: '900 Congress Ave',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['MGA'],
    role_details: {
      underwriting_authority_limit: 5000000,
      agreement_ref: 'AGR-HARBOR-SUMMIT-2026',
      retained_commission_pct: 10.0
    }
  },

  // 3. Retail Brokers & Producing Agencies
  {
    party_code: 'BROKER-BRIGHTLINE',
    legal_name: 'Brightline Retail Risk Agency LLC',
    trade_name: 'Brightline Agency',
    party_type: 'ORGANIZATION',
    tax_id: '75-9876543',
    email: 'producers@brightlineagency.com',
    phone: '214-555-0180',
    address: {
      street1: '2100 Ross Ave',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75201',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['BROKER', 'PRODUCER'],
    role_details: {
      license_number: 'TX-BRK-9921',
      producer_tier: 'PLATINUM',
      commission_split_pct: 10.0
    }
  },
  {
    party_code: 'BROKER-LONESTAR',
    legal_name: 'Lone Star Freight Risk Agency Inc.',
    trade_name: 'Lone Star Risk',
    party_type: 'ORGANIZATION',
    tax_id: '74-3322110',
    email: 'service@lonestarrisk.com',
    phone: '713-555-0199',
    address: {
      street1: '1000 Louisiana St',
      city: 'Houston',
      state: 'TX',
      postal_code: '77002',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['BROKER', 'PRODUCER'],
    role_details: {
      license_number: 'TX-BRK-8842',
      producer_tier: 'GOLD',
      commission_split_pct: 10.0
    }
  },
  {
    party_code: 'BROKER-AUSTIN',
    legal_name: 'Austin Commercial Risk Partners LLC',
    trade_name: 'Austin Risk Partners',
    party_type: 'ORGANIZATION',
    tax_id: '74-5544332',
    email: 'commercial@austinrisk.com',
    phone: '512-555-0122',
    address: {
      street1: '500 W 2nd St',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['BROKER', 'PRODUCER'],
    role_details: {
      license_number: 'TX-BRK-7719',
      producer_tier: 'SILVER',
      commission_split_pct: 12.0
    }
  },

  // 4. Insured Policyholders (Commercial Fleet & Logistics Customers)
  {
    party_code: 'INSURED-LONEPINE',
    legal_name: 'Lone Pine Trucking LLC',
    trade_name: 'Lone Pine Freight',
    party_type: 'ORGANIZATION',
    tax_id: '74-9876543',
    email: 'dispatch@lonepinetrucking.com',
    phone: '432-555-0199',
    address: {
      street1: '400 W Wall St',
      city: 'Midland',
      state: 'TX',
      postal_code: '79701',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['INSURED', 'POLICYHOLDER'],
    role_details: {
      dot_number: '3189201',
      mc_number: 'MC-992144',
      fleet_units: 18,
      primary_line: 'COMMERCIAL_AUTO_FLEET'
    }
  },
  {
    party_code: 'INSURED-WESTERNSTAR',
    legal_name: 'Western Star Heavy Haul LLC',
    trade_name: 'Western Star Transport',
    party_type: 'ORGANIZATION',
    tax_id: '75-3129841',
    email: 'safety@westernstarhaul.com',
    phone: '432-555-0245',
    address: {
      street1: '2800 E Interstate 20',
      city: 'Odessa',
      state: 'TX',
      postal_code: '79761',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['INSURED', 'POLICYHOLDER'],
    role_details: {
      dot_number: '2894102',
      mc_number: 'MC-871239',
      fleet_units: 24,
      primary_line: 'MOTOR_TRUCK_CARGO'
    }
  },
  {
    party_code: 'INSURED-SUNBELT',
    legal_name: 'Sunbelt Express Logistics Corp',
    trade_name: 'Sunbelt Freight Lines',
    party_type: 'ORGANIZATION',
    tax_id: '75-6821903',
    email: 'billing@sunbeltlogistics.com',
    phone: '817-555-0377',
    address: {
      street1: '4500 Alliance Gateway Fwy',
      city: 'Fort Worth',
      state: 'TX',
      postal_code: '76177',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['INSURED', 'POLICYHOLDER'],
    role_details: {
      dot_number: '3409182',
      mc_number: 'MC-914022',
      fleet_units: 35,
      primary_line: 'COMMERCIAL_AUTO_FLEET'
    }
  },

  // 5. Reinsurance Companies
  {
    party_code: 'REINSURER-MUNICH',
    legal_name: 'Munich Reinsurance America Inc.',
    trade_name: 'Munich Re America',
    party_type: 'ORGANIZATION',
    tax_id: '22-1402941',
    email: 'treaty.casualty@munichre.com',
    phone: '609-555-0100',
    address: {
      street1: '555 College Rd E',
      city: 'Princeton',
      state: 'NJ',
      postal_code: '08540',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['REINSURER'],
    role_details: {
      naic_code: '10227',
      am_best_rating: 'A+ (Superior)',
      treaty_type: 'QUOTA_SHARE_20_PCT',
      retention_limit: 1000000
    }
  },
  {
    party_code: 'REINSURER-SWISS',
    legal_name: 'Swiss Re America Corporation',
    trade_name: 'Swiss Re',
    party_type: 'ORGANIZATION',
    tax_id: '13-5291044',
    email: 'americas.underwriting@swissre.com',
    phone: '914-555-0200',
    address: {
      street1: '175 King St',
      city: 'Armonk',
      state: 'NY',
      postal_code: '10504',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['REINSURER'],
    role_details: {
      naic_code: '25364',
      am_best_rating: 'A+ (Superior)',
      treaty_type: 'EXCESS_OF_LOSS',
      attachment_point: 2000000
    }
  },

  // 6. Independent Claims Adjuster / Third-Party Administrator (TPA)
  {
    party_code: 'ADJUSTER-CRAWFORD',
    legal_name: 'Crawford & Company Claims Solutions Inc.',
    trade_name: 'Crawford Claims TPA',
    party_type: 'ORGANIZATION',
    tax_id: '58-0506555',
    email: 'texas.claims@us.crawco.com',
    phone: '214-555-0160',
    address: {
      street1: '14241 Dallas Pkwy',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75254',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['ADJUSTER'],
    role_details: {
      license_number: 'TX-TPA-8821',
      claim_authority_limit: 50000,
      specialty: 'COMMERCIAL_AUTO_PHYSICAL_DAMAGE'
    }
  },

  // 7. Service Providers (Direct Repair Facility & Defense Counsel)
  {
    party_code: 'PROVIDER-MIDLAND-REPAIR',
    legal_name: 'Midland Heavy Duty Collision & Repair Center LLC',
    trade_name: 'Midland Fleet Repair',
    party_type: 'ORGANIZATION',
    tax_id: '75-9018442',
    email: 'estimates@midlandfleetrepair.com',
    phone: '432-555-0144',
    address: {
      street1: '3201 W Florida Ave',
      city: 'Midland',
      state: 'TX',
      postal_code: '79701',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['SERVICE_PROVIDER'],
    role_details: {
      service_type: 'FLEET_BODY_AND_FRAME_REPAIR',
      certified_drp: true,
      labor_rate_hourly: 95.0
    }
  },
  {
    party_code: 'PROVIDER-WILSON-LEGAL',
    legal_name: 'Wilson & Associates Insurance Defense Counsel LLP',
    trade_name: 'Wilson Legal Defense',
    party_type: 'ORGANIZATION',
    tax_id: '75-8127394',
    email: 'intake@wilsondefenselegal.com',
    phone: '214-555-0195',
    address: {
      street1: '1717 Main St Suite 3400',
      city: 'Dallas',
      state: 'TX',
      postal_code: '75201',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['DEFENSE_COUNSEL', 'SERVICE_PROVIDER'],
    role_details: {
      panel_status: 'APPROVED_CARRIER_DEFENSE_PANEL',
      state_bar_ref: 'TX-BAR-67210',
      hourly_rate: 275.0
    }
  },

  // 8. Regulatory Authority
  {
    party_code: 'REGULATOR-TDI',
    legal_name: 'Texas Department of Insurance',
    trade_name: 'TDI',
    party_type: 'ORGANIZATION',
    tax_id: '74-6000108',
    email: 'statutory.filings@tdi.texas.gov',
    phone: '800-578-4677',
    address: {
      street1: '1601 Congress Ave',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701',
      country: 'USA'
    },
    status: 'ACTIVE',
    role_types: ['REGULATOR'],
    role_details: {
      jurisdiction: 'TX',
      department_code: 'TDI-4500'
    }
  }
];

async function seedDefaultCounterparties(tenantId) {
  if (!tenantId) return [];

  // STEP 1: Purge any legacy retail counterparties and non-insurance roles from this tenant
  const retailParties = await Party.find({
    tenant_id: tenantId,
    $or: [
      { party_code: { $regex: /^(CUST-|SUPP-|FRANCHISE-|VEND-|HUB-)/i } },
      { legal_name: { $regex: /(Apex Wholesale|Bharat Logistics|Global Goods|Horizon Tech|Metro Hypermarket|Mumbai Central|Premier Commercial|Veridex Central Corporate)/i } }
    ]
  }).select('_id');

  if (retailParties.length > 0) {
    const retailIds = retailParties.map(p => p._id);
    await PartyRole.deleteMany({ tenant_id: tenantId, party_id: { $in: retailIds } });
    await Party.deleteMany({ _id: { $in: retailIds } });
  }

  // Remove obsolete retail role assignments (CUSTOMER, SUPPLIER, FRANCHISE, VENDOR, MAIN_HUB)
  await PartyRole.deleteMany({
    tenant_id: tenantId,
    role_type: { $in: ['CUSTOMER', 'SUPPLIER', 'FRANCHISE', 'VENDOR', 'MAIN_HUB'] }
  });

  // STEP 2: Upsert pure insurance counterparties and their respective roles
  const createdParties = [];

  for (const item of DEFAULT_COUNTERPARTIES) {
    const { role_types, role_type, role_details, ...partyProps } = item;
    const targetRoles = role_types || (role_type ? [role_type] : ['INSURED']);

    let party = await Party.findOne({
      tenant_id: tenantId,
      party_code: partyProps.party_code
    });

    if (!party) {
      party = await Party.create({
        ...partyProps,
        tenant_id: tenantId
      });
    } else {
      party.legal_name = partyProps.legal_name;
      party.trade_name = partyProps.trade_name;
      party.email = partyProps.email;
      party.phone = partyProps.phone;
      party.tax_id = partyProps.tax_id;
      party.address = partyProps.address;
      party.status = partyProps.status;
      await party.save();
    }

    // Upsert each assigned role
    for (const rType of targetRoles) {
      const normRole = rType.toUpperCase().trim();
      let role = await PartyRole.findOne({
        tenant_id: tenantId,
        party_id: party._id,
        role_type: normRole
      });

      if (!role) {
        role = await PartyRole.create({
          tenant_id: tenantId,
          party_id: party._id,
          role_type: normRole,
          status: 'ACTIVE',
          role_details: role_details || {}
        });
      } else {
        role.status = 'ACTIVE';
        role.role_details = { ...(role.role_details || {}), ...(role_details || {}) };
        await role.save();
      }
    }

    createdParties.push(party);
  }

  return createdParties;
}

module.exports = {
  DEFAULT_COUNTERPARTIES,
  seedDefaultCounterparties
};
