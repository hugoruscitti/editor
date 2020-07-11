FROM ruby

FROM ruby:2.7
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN apt-get update -qq && apt-get install -y nodejs
RUN apt-get install -y npm
RUN npm install -g yarn
RUN bundle install
COPY . .

ENV PORT 3000
EXPOSE $PORT

CMD ["rails", "server", "-b", "0.0.0.0"]
