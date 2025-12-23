FROM ruby:3.3-alpine

RUN apk add --no-cache build-base

# Install necessary gems
RUN gem install webrick activesupport

WORKDIR /app

EXPOSE 3001

CMD ["ruby", "server.rb"]
