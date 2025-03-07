import json
from cassiopeia import get_champions
from roleidentification import pull_data

def create_role_mapping(threshold=0.05):
    # Step 1: Fetch role data
    champion_roles = pull_data()
    
    # Step 2: Get champion ID-to-name mapping
    champions = get_champions(region="NA")
    id_to_name = {champion.id: champion.name for champion in champions}
    
    # Step 3: Build the role mapping
    role_mapping = {}
    for champion_id, roles in champion_roles.items():
        if champion_id not in id_to_name:
            continue  # Skip if ID isn’t found (rare case)
        name = id_to_name[champion_id]
        
        # Filter and sort roles by play rate
        significant_roles = [(role, rate) for role, rate in roles.items() if rate >= threshold]
        significant_roles.sort(key=lambda x: x[1], reverse=True)  # Sort descending by play rate
        role_list = [role for role, rate in significant_roles]
        
        if role_list:  # Only include champions with at least one significant role
            role_mapping[name] = role_list
    
    # Step 4: Save to JSON
    with open("champion_roles.json", "w") as f:
        json.dump(role_mapping, f, indent=4)
    
    return role_mapping

if __name__ == "__main__":
    create_role_mapping(threshold=0.05)
    print("Role mapping saved to champion_roles.json")