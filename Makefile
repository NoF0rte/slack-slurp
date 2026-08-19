setup::
	go mod download
	cd web && npm install

assets::
	cd web && npm run build

build:: assets
	go build

install:: assets
	go install