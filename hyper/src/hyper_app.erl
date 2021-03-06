-module(hyper_app).
-behaviour(application).

-export([start/2]).
-export([stop/1]).

-include("hyper.hrl").

start(_Type, _Args) ->
    Paths = [{"/api/[...]", hyper_http, []},
             {"/photos/[...]", cowboy_static, {priv_dir, hyper, "./photos/"}},
             {"/index.css", cowboy_static, {priv_file, hyper, "./frontend/index.css"}},
             {"/favicon.ico", cowboy_static, {priv_file, hyper, "./frontend/favicon.ico"}},
             {"/static/[...]", cowboy_static, {priv_dir, hyper, "./frontend/static/"}},
             {"/[...]", cowboy_static, {priv_file, hyper, "./frontend/index.html"}}],
    Dispatch = cowboy_router:compile([{'_', Paths}]),
    {ok, _} = cowboy:start_clear(hyper_http_listener, [{port, ?HTTP_PORT}], #{env => #{dispatch => Dispatch}}),
    hyper_mnesia:init_tables(),
    hyper_validation:load(),
    pgapp:connect([{size, 10}, {host, "localhost"}, {database, "Hypertube"}, {password, "12345"},
                   {username, "Hypertube"}, {port, 5432}]),
    hyper_sup:start_link().

stop(_State) ->
	ok.

