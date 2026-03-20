package authz

const (
	RoleStudent             = "student"
	RoleInstructor          = "instructor"
	RoleInstitutionAdmin    = "institution_admin"
	RoleContentManager      = "content_manager"
	RoleSubscriptionManager = "subscription_manager"
	RoleSuperAdmin          = "super_admin"
)

var roleHierarchy = map[string][]string{
	RoleStudent:             {},
	RoleInstructor:          {RoleStudent},
	RoleInstitutionAdmin:    {RoleStudent},
	RoleContentManager:      {RoleInstructor, RoleStudent},
	RoleSubscriptionManager: {RoleInstitutionAdmin, RoleStudent},
	RoleSuperAdmin: {
		RoleSubscriptionManager,
		RoleContentManager,
		RoleInstitutionAdmin,
		RoleInstructor,
		RoleStudent,
	},
}

func SystemRoles() []string {
	return []string{
		RoleStudent,
		RoleInstructor,
		RoleInstitutionAdmin,
		RoleContentManager,
		RoleSubscriptionManager,
		RoleSuperAdmin,
	}
}

func SelfRegisterableRoles() []string {
	return []string{
		RoleStudent,
		RoleInstructor,
	}
}

func NormalizeRoleClaims(value interface{}) []string {
	switch v := value.(type) {
	case []string:
		return v
	case []interface{}:
		roles := make([]string, 0, len(v))
		for _, item := range v {
			if role, ok := item.(string); ok {
				roles = append(roles, role)
			}
		}
		return roles
	default:
		return nil
	}
}

func ExpandRoles(roles []string) map[string]struct{} {
	expanded := make(map[string]struct{})
	var visit func(string)
	visit = func(role string) {
		if role == "" {
			return
		}
		if _, seen := expanded[role]; seen {
			return
		}
		expanded[role] = struct{}{}
		for _, inherited := range roleHierarchy[role] {
			visit(inherited)
		}
	}

	for _, role := range roles {
		visit(role)
	}

	return expanded
}

func HasAnyRole(roles []string, allowed ...string) bool {
	expanded := ExpandRoles(roles)
	for _, role := range allowed {
		if _, ok := expanded[role]; ok {
			return true
		}
	}
	return false
}
