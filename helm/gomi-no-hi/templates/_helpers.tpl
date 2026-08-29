{{- define "gomi-no-hi.frontendImage" -}}
{{- $repo := .Values.frontend.image.repository | default (printf "%s/%s/gomi-no-hi-frontend" .Values.registry.server .Values.registry.username) -}}
{{- printf "%s:%s" $repo .Values.frontend.image.tag -}}
{{- end }}

{{- define "gomi-no-hi.backendImage" -}}
{{- $repo := .Values.backend.image.repository | default (printf "%s/%s/gomi-no-hi-backend" .Values.registry.server .Values.registry.username) -}}
{{- printf "%s:%s" $repo .Values.backend.image.tag -}}
{{- end }}
