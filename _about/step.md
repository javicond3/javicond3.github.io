<div class="container row">
    <h1 class="cv-title"><span class="title_history">My Life</span></h1>
    {% assign steps = site.steps | sort: 'date' %}
    {% for step in steps %}
    {% assign date_initial = step.date | date: '%m/%Y' %}
    <div class="item">
        <i class="vertical-line"></i>
        <h2 class="item-date">
        {% if date_initial == "01/2100" %}
            Everyday
        {% else %}
            {{ step.date | date: '%m/%Y' }}{% if step.enddate %} - {{ step.enddate | date: '%m/%Y' }}{% endif %}{% if step.enddatetoday %} - Today{% endif %}
        {% endif %}
        {% if step.titleprincipal %}
            : <small>{{step.titleprincipal}}</small>
        {% endif %} 
        {% assign content = step.content | strip_newlines %}
        {% if content == "" %}
            - <small>{{step.subtitle}}</small>
        {% endif %}
        </h2>
        {% if content != "" %}
            <div class="card-panel">
                <h3 class="card-title">
                    {{ step.subtitle }}
                </h3>
                <p>
                    {{ content }}
                </p>
            </div>
        {% endif %}
    </div>
    {% endfor %}
    <!-- <div class="last-item">
        <i class="vertical-line"></i>
    </div> -->
  </div>